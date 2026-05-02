# Notification System Design

## Stage 1 — REST API Design

**Base URL:** `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (paginated, `?page=1&limit=20`) |
| GET | `/api/notifications/:id` | Get single notification |
| POST | `/api/notifications` | Create notification |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/mark-all-read` | Mark all read for a student |
| DELETE | `/api/notifications/:id` | Soft-delete |
| GET | `/api/notifications/unread-count` | Badge count |
| GET | `/api/notifications/priority-inbox` | Top N ranked unread (`?top=10`) |
| POST | `/api/notifications/invalidate-cache` | Force cache refresh |

**Conventions:** Endpoints use kebab-case nouns. Request/response bodies use camelCase. Standard HTTP codes (200, 201, 400, 404, 500).

---

## Stage 2 — Database Schema

**Choice: PostgreSQL (SQL)**

SQL fits because our queries are highly structured — filter by `student_id`, `is_read`, sort by `created_at`. PostgreSQL provides composite indexes, partial indexes, and ACID transactions for consistent read-status updates.

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      INTEGER NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'general',
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    priority        VARCHAR(20) DEFAULT 'normal',
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE notification_delivery_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id),
    channel         VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempt_count   INTEGER DEFAULT 0,
    last_error      TEXT,
    sent_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Scalability:** Partition by `created_at` monthly, archive data older than 6 months, use read replicas for list queries, PgBouncer for connection pooling.

---

## Stage 3 — Query Optimization

**Original (problematic):**
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;
```

**Issues:** `SELECT *` fetches unnecessary blobs, no `LIMIT` returns unbounded rows, no index means full table scan, column names violate PostgreSQL conventions.

**Indexing strategy:**
```sql
CREATE INDEX idx_notif_student_unread ON notifications (student_id, is_read, created_at DESC)
WHERE is_read = FALSE AND deleted_at IS NULL;
```

**Optimized query:**
```sql
SELECT id, student_id, type, title, priority, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

The partial index only indexes unread rows (a small fraction of total data), keeping it compact. Query goes from O(N) full scan to O(log N) index lookup.

---

## Stage 4 — Performance Improvements

**Caching:** In-memory cache with 30s TTL. Cache key pattern: `notif:student:{id}:page:{n}`. Invalidated on writes. For production, Redis with 10s TTL for unread counts.

**Pagination:** Offset-based for simplicity (`?page=1&limit=20`). Cursor-based available for scale (O(1) for any page).

**Lazy loading:** Initial load fetches top 20 + unread count only. Full notification body fetched on-demand when clicked. Next pages loaded on scroll.

**Trade-offs:** Cache gives 0ms response but data can be stale up to 30s. Pagination bounds response size but requires multiple requests. Lazy loading gives fast initial paint but delays access to older items.

---

## Stage 5 — Notify All Fix

**Problem:** Current `notify_all` sends emails synchronously in a for-loop. One failure kills the entire batch, and sequential execution is extremely slow at scale.

**Solution architecture:**

```
API Server → Producer → Message Queue (RabbitMQ) → Consumer Workers → Email/Push/SMS
                                                  → Retry Queue → Dead Letter Queue
```

**Why RabbitMQ:** Built-in retry/dead-letter queues, per-message acknowledgment, designed for task distribution (vs Kafka's log streaming).

**Producer** batches messages (100 at a time) into the queue and returns immediately. **Workers** process each message independently — one email failure doesn't affect others. DB write and email sending should NOT be synchronous — they should be decoupled via the message queue.

**Retry mechanism** uses exponential backoff: immediate → 30s → 2min → dead letter queue after 3 failures.

**Separation of concerns:**

| Component | Responsibility |
|-----------|---------------|
| API Server | Accept requests, validate input |
| Producer | Fan out messages to queue |
| Email/Push/SMS Workers | Channel-specific delivery only |
| Retry Manager | Failure handling and DLQ routing |
| Delivery Logger | Track status in `notification_delivery_log` |

---

## Stage 6 — Priority Inbox

Fetches notifications dynamically from `GET /evaluation-service/notifications` (no DB storage).

**Ranking formula:**
```
score = (typeWeight × 1000) + (timestamp_ms / 1,000,000)
```

The ×1000 multiplier ensures type importance always dominates recency. Within the same type tier, newer items rank higher.

**Type weights:** result/placement=10, academic=9, alert/assignment=8, warning=7, system=6, reminder/event=5, update=4, info=3, general=2, promotional=1.

**Efficient updates:** 30s in-memory cache prevents redundant API calls. `POST /invalidate-cache` endpoint allows targeted refresh after user actions. Unread count endpoint is lightweight with no ranking computation.
