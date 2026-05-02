const { fetchNotifications } = require("../repository/notification.repository");
const { rankNotifications } = require("../utils/priorityRanker");
const { log, LOG_LEVELS } = require("logging-middleware");

let cache = {
  data: null,
  lastFetched: 0,
  TTL: 30 * 1000,
};

async function getNotificationsWithCache() {
  const now = Date.now();

  if (cache.data && now - cache.lastFetched < cache.TTL) {
    log("backend", LOG_LEVELS.DEBUG, "service", "Returning cached notifications");
    return cache.data;
  }

  log("backend", LOG_LEVELS.INFO, "service", "Cache miss — fetching fresh notifications");
  const rawData = await fetchNotifications();

  const notifications = Array.isArray(rawData)
    ? rawData
    : rawData.notifications || rawData.data || [];

  cache.data = notifications;
  cache.lastFetched = now;

  return notifications;
}

function invalidateCache() {
  cache.data = null;
  cache.lastFetched = 0;
  log("backend", LOG_LEVELS.INFO, "service", "Notification cache invalidated");
}

async function getAllNotifications(page = 1, limit = 20) {
  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Getting all notifications — page=${page}, limit=${limit}`
  );

  const notifications = await getNotificationsWithCache();

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = notifications.slice(startIndex, endIndex);

  return {
    notifications: paginated,
    pagination: {
      currentPage: page,
      perPage: limit,
      totalItems: notifications.length,
      totalPages: Math.ceil(notifications.length / limit),
      hasNext: endIndex < notifications.length,
      hasPrev: page > 1,
    },
  };
}

async function getPriorityInbox(topN = 10) {
  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Computing priority inbox — top ${topN} unread`
  );

  const notifications = await getNotificationsWithCache();

  const unread = notifications.filter((n) => {
    const isRead = n.isRead ?? n.is_read ?? n.read ?? false;
    return !isRead;
  });

  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Found ${unread.length} unread notifications out of ${notifications.length} total`
  );

  const ranked = rankNotifications(unread, topN);

  return {
    notifications: ranked,
    totalUnread: unread.length,
    showing: ranked.length,
  };
}

async function getUnreadCount() {
  const notifications = await getNotificationsWithCache();
  const unread = notifications.filter((n) => {
    const isRead = n.isRead ?? n.is_read ?? n.read ?? false;
    return !isRead;
  });

  return { unreadCount: unread.length, totalCount: notifications.length };
}

module.exports = {
  getAllNotifications,
  getPriorityInbox,
  getUnreadCount,
  invalidateCache,
};
