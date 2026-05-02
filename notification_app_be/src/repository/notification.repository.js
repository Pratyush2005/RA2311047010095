const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../utils/config");
const { log, LOG_LEVELS } = require("logging-middleware");

const HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchNotifications() {
  log(
    "backend",
    LOG_LEVELS.INFO,
    "repository",
    "Fetching notifications from external API"
  );

  try {
    const response = await axios.get(
      `${BASE_URL}/evaluation-service/notifications`,
      {
        headers: HEADERS,
        timeout: 10000,
      }
    );

    log(
      "backend",
      LOG_LEVELS.INFO,
      "repository",
      "Successfully fetched notifications"
    );

    return response.data;
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "repository",
      `Failed to fetch notifications: ${err.message}`
    );
    throw new Error(`Notifications API call failed: ${err.message}`);
  }
}

module.exports = { fetchNotifications };
