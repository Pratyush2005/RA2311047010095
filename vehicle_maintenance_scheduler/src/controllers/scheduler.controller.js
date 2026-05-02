const { computeSchedule } = require("../services/scheduler.service");
const { log, LOG_LEVELS } = require("logging-middleware");

async function getSchedule(req, res, next) {
  log("backend", LOG_LEVELS.INFO, "controller", "Schedule endpoint called");

  try {
    const result = await computeSchedule();

    log(
      "backend",
      LOG_LEVELS.INFO,
      "controller",
      `Schedule computed successfully — ${result.summary.totalDepots} depots, total impact: ${result.summary.totalImpact}`
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "controller",
      `Schedule computation failed: ${err.message}`
    );

    return next(err);
  }
}

async function healthCheck(req, res) {
  log("backend", LOG_LEVELS.DEBUG, "controller", "Health check requested");

  return res.status(200).json({
    success: true,
    service: "vehicle-maintenance-scheduler",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getSchedule, healthCheck };
