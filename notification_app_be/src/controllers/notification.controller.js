const {
  getAllNotifications,
  getPriorityInbox,
  getUnreadCount,
  invalidateCache,
} = require("../services/notification.service");
const { log, LOG_LEVELS } = require("logging-middleware");

async function listNotifications(req, res, next) {
  log("backend", LOG_LEVELS.INFO, "controller", "List notifications endpoint called");

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getAllNotifications(page, limit);

    log(
      "backend",
      LOG_LEVELS.INFO,
      "controller",
      `Returning ${result.notifications.length} notifications (page ${page})`
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "controller",
      `Failed to list notifications: ${err.message}`
    );
    return next(err);
  }
}

async function priorityInbox(req, res, next) {
  log("backend", LOG_LEVELS.INFO, "controller", "Priority inbox endpoint called");

  try {
    const topN = parseInt(req.query.top, 10) || 10;
    const result = await getPriorityInbox(topN);

    log(
      "backend",
      LOG_LEVELS.INFO,
      "controller",
      `Priority inbox: returning top ${result.showing} of ${result.totalUnread} unread`
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "controller",
      `Priority inbox failed: ${err.message}`
    );
    return next(err);
  }
}

async function unreadCount(req, res, next) {
  log("backend", LOG_LEVELS.INFO, "controller", "Unread count endpoint called");

  try {
    const result = await getUnreadCount();

    log(
      "backend",
      LOG_LEVELS.DEBUG,
      "controller",
      `Unread count: ${result.unreadCount}`
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "controller",
      `Unread count failed: ${err.message}`
    );
    return next(err);
  }
}

async function refreshCache(req, res) {
  log("backend", LOG_LEVELS.INFO, "controller", "Cache invalidation requested");

  invalidateCache();

  return res.status(200).json({
    success: true,
    message: "Notification cache invalidated — next request will fetch fresh data",
  });
}

async function healthCheck(req, res) {
  log("backend", LOG_LEVELS.DEBUG, "controller", "Health check requested");

  return res.status(200).json({
    success: true,
    service: "notification-app-be",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  listNotifications,
  priorityInbox,
  unreadCount,
  refreshCache,
  healthCheck,
};
