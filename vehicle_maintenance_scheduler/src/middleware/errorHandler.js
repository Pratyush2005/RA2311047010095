const { log, LOG_LEVELS } = require("logging-middleware");

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  log(
    "backend",
    LOG_LEVELS.ERROR,
    "handler",
    `Unhandled error on ${req.method} ${req.originalUrl}: ${message}`
  );

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

module.exports = { errorHandler };
