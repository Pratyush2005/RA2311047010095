# Notification System Design

## Stage 1 — REST API Design

**Base URL:** `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | View all of your notifications. Paginated. Retrieved with something like `? page=1&limit=20` I’m guessing.
| GET | /api/notifications/:id | Get a single notification by id.
| POST | `/api/notifications` | Create notification |
| PATCH | `/api/notifications/:id/read` | Read a single notification.
| PATCH | `/api/notifications` | View all unread notifications
| DELETE | `/api/notifications/:id` | Soft-delete |
| GET | `/api/notifications/unread-count` | Badge count |
| GET | `/api/notifications/priority-inbox` | All top unread priority inbox notifications. Can be filtered for top N unread with `? top=10`.
| POST | /api/notifications/invalidate-cache | Force Notification Cache Refresh.

**Endpoint naming conventions:** All endpoint names are kebab-case nouns, and all request and response body properties are camelCase.
**HTTP status codes:** Standard HTTP status codes (200, 201, 400, etc.) are used throughout the API.

---

## Stage 2 — Database Schema

**Choice: PostgreSQL (SQL)**

I've written the query in SQL instead of DataFu Java Streams, as it's pretty straightforward to select and group the rows as needed, filtering for student_id and is_read, sorted by created_at. For a PostgreSQL database, I could create a composite index on student_id and is_read, or even a partial index, which would speed up the query. With or without the index, the update statement will be transactional, atomic, consistent, isolated, and durable (ACID compliant), so I'm safe in knowing that I'll update all the student messages to an unread state consistently.

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
/* OnCreate */kova_object_created_at(){      return "    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),";}
/* updated_at */ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() ,
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
# created_at
TYPE: TIMESTAMP WITH TIME ZONE
DEFAULT: created_at
DESCRIPTION: Timestamp when the row was created.
);
```

**Scalability**: partition by month of created_at, archive data > 6mo, use read replicas for list queries, PgBouncer for connection pooling.

---

## Stage 3 — Query Optimization

**Original (problematic):**
```sql
SELECT * FROM notifications WHERE studentID = 1022 AND isRead = 'f' ORDER BY createdAt DESC;
```

**problems**: SELECT * downloads unwanted blobs, SELECT * without limit downloads too many rows, no index means table is fully scanned, and column names are named in a way that is non PostgreSQL compliant.

**Indexing strategy:**
```sql
CREATE INDEX idx_notif_student_unread ON notifications (student_id, is_read) DESC;
WHERE is_read = FALSE AND deleted_at IS NULL;
```

**Optimized query:**
```sql
SELECT id, student_id, type, title, priority, is_read, created_at
FROM notifications
Load 24 comments directly (no join required) to analyze their attributes.
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

Partial index allows indexing only unread portion of the data. The index is much smaller than regular index. Performance changes from O(N) full table scan to O(log N) index lookup.

---

## Stage 4 — Performance Improvements

**Caching**: We use an in-memory cache which expires in 30 seconds. We use the following pattern for cache keys: `notif:student:{id}:page:{n}`, and these cache entries are invalidated every time we write to the notifications. In production we use Redis and unread counts expire in 10 seconds.

**Pagination:** Offset-based (simple) - ? page=1&limit=20. cursor-based pagination available for scaled use cases (O(1) for any page).

**Lazy load functionality added**: The first page now loads the top 20 posts and their unread count, and then their body text on the fly when clicked on. Also, subsequent pages are automatically loaded as the user scrolls down the page.

**Trade-offs:**
Cache: 0ms response, but data could be stale up to 30s. Pagination: bounds response size, but requires multiple requests. Lazy loading: fast initial paint, but delays for items far in list.

---

## Stage 5 — Notify All Fix

**Problem:** Notify all emails are currently generated as a for-loop. One failure per batch is acceptable, but one failure per batch should not kill the whole batch. Instead, the process should be concurrent for all batches to improve performance on large items.

**Solution architecture:**

```
API Server → Producer → Message Queue (RabbitMQ) → Consumer Workers → External services (Email/Push/SMS etc)
→ Retry Queue → Dead Letter Queue
```

**Why RabbitMQ:** RabbitMQ has built-in retry/dead-letter queues and per-message acknowledgment. Kafka is meant for log streaming (not task distribution like RabbitMQ).

**Producer**: Send 100 messages, then continue sending and the function will return immediately. ** Workers**: Each message is processed separately. Therefore, a failed 1 email will not affect other emails.

**Our retry mechanism is** exponential backoff, immediate retry, then 30s, 2min, and then dead letter queue after 3 failures.

**Separation of concerns:**

| Component | Responsibility |
|-----------|---------------|
| API Server | Processes client requests and validates client input.
| Producer | Fan out messages to multiple queues.
| Email/Push/SMS Workers | Channel-specific delivery only |
| Retry Manager | Manage failed messages & direct to Dead Letter Queue (DLQ) |
| Delivery Logger | Exists as a notification delivery logger.

**Stellar Delivery**: Fault isolation, horizontal scaling, backpressure absorption, full delivery observability.

---

## Stage 6 — Priority Inbox

These commands get the notifications dynamically from: GET /evaluation-service/notifications. This means these commands don't store anything in DB.

**Ranking formula:**
```
The score for an item is a number that is calculated based on the type weight of the type of the item and then increased by the number of milliseconds in a certain area of the item.
```

The ×1000 multiplier in the recency ranking is set up so that type always trumps recency. In the recency ranking, items of the same type are ordered by newest first. Items of different types are ordered by the highest type first. Items of the lowest type are ordered by oldest first.

**Type weight**: urgent/exam (10pt), academic (9pt), alert/assignment (8pt), warning (7pt), system message (6pt), reminder/event (5pt), update (4pt)

**Efficient updates**: Our 30s in-memory cache prevents many of these calls from ever hitting the API, and we also have a POST /invalidate-cache endpoint that you can update the cache with after certain user actions. For example, the endpoint for the number of unread messages is very efficient and doesn’t compute the ranking for you.
