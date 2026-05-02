const express = require("express");
const cors = require("cors");
const { requestLoggerMiddleware, log, LOG_LEVELS } = require("logging-middleware");
const {
  listNotifications,
  priorityInbox,
  unreadCount,
  refreshCache,
  healthCheck,
} = require("./src/controllers/notification.controller");
const { errorHandler } = require("./src/middleware/errorHandler");
const { PORT } = require("./src/utils/config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware);

app.get("/api/health", healthCheck);
app.get("/api/notifications", listNotifications);
app.get("/api/notifications/priority-inbox", priorityInbox);
app.get("/api/notifications/unread-count", unreadCount);
app.post("/api/notifications/invalidate-cache", refreshCache);

app.use(errorHandler);

app.listen(PORT, () => {
  log(
    "backend",
    LOG_LEVELS.INFO,
    "handler",
    `Notification App Backend running on port ${PORT}`
  );
});

module.exports = app;
