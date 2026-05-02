const express = require("express");
const cors = require("cors");
const { requestLoggerMiddleware, log, LOG_LEVELS } = require("logging-middleware");
const { getSchedule, healthCheck } = require("./src/controllers/scheduler.controller");
const { errorHandler } = require("./src/middleware/errorHandler");
const { PORT } = require("./src/utils/config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware);

app.get("/api/health", healthCheck);
app.get("/api/schedule", getSchedule);

app.use(errorHandler);

app.listen(PORT, () => {
  log(
    "backend",
    LOG_LEVELS.INFO,
    "handler",
    `Vehicle Maintenance Scheduler running on port ${PORT}`
  );
});

module.exports = app;
