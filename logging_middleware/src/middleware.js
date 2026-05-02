const { log, LOG_LEVELS } = require("./logger");

function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();

  log(
    "backend",
    LOG_LEVELS.INFO,
    "controller",
    `Incoming ${req.method} ${req.originalUrl} from ${req.ip}`
  );

  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;

    log(
      "backend",
      level,
      "controller",
      `Response ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = { requestLoggerMiddleware };
