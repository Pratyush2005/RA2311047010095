const axios = require("axios");

const LOG_API_URL = "http://20.207.122.201/evaluation-service/logs";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJwcDUwMjBAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMDQwMiwiaWF0IjoxNzc3Njk5NTAyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYTQyNmIzODYtYjQ3My00ZGJmLWExYjctYjNkNTM5ODI1NWNiIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicHJhdHl1c2ggcHJhZGhhbiIsInN1YiI6Ijc1NDE5ZDk4LTEzMmItNDY1ZS04YmFkLWEzZGZlMWM2NmI4YiJ9LCJlbWFpbCI6InBwNTAyMEBzcm1pc3QuZWR1LmluIiwibmFtZSI6InByYXR5dXNoIHByYWRoYW4iLCJyb2xsTm8iOiJyYTIzMTEwNDcwMTAwOTUiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiI3NTQxOWQ5OC0xMzJiLTQ2NWUtOGJhZC1hM2RmZTFjNjZiOGIiLCJjbGllbnRTZWNyZXQiOiJuVmRwRGFZUnhrelJVdnRxIn0.f0t6t76h-eu3VLzVxRBER7p_iZheH727vXC-dozYSTw";

const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
};

const VALID_LEVELS = Object.values(LOG_LEVELS);
const VALID_PACKAGES = ["controller", "service", "repository", "handler", "db"];

async function log(stack, level, pkg, message) {
  if (stack !== "backend") {
    return;
  }

  if (!VALID_LEVELS.includes(level)) {
    return;
  }

  if (!VALID_PACKAGES.includes(pkg)) {
    return;
  }

  const payload = {
    stack,
    level,
    package: pkg,
    message: `[${new Date().toISOString()}] ${message}`,
  };

  try {
    await axios.post(LOG_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
  } catch (err) {
  }
}

module.exports = { log, LOG_LEVELS };
