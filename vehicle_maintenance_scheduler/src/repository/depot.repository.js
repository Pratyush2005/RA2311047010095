const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../utils/config");
const { log, LOG_LEVELS } = require("logging-middleware");

const HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchDepots() {
  log("backend", LOG_LEVELS.INFO, "repository", "Fetching depots from external API");

  try {
    const response = await axios.get(`${BASE_URL}/evaluation-service/depots`, {
      headers: HEADERS,
      timeout: 10000,
    });

    log(
      "backend",
      LOG_LEVELS.INFO,
      "repository",
      `Successfully fetched ${Array.isArray(response.data) ? response.data.length : "unknown"} depots`
    );

    return response.data;
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "repository",
      `Failed to fetch depots: ${err.message}`
    );
    throw new Error(`Depot API call failed: ${err.message}`);
  }
}

async function fetchVehicles() {
  log("backend", LOG_LEVELS.INFO, "repository", "Fetching vehicles from external API");

  try {
    const response = await axios.get(`${BASE_URL}/evaluation-service/vehicles`, {
      headers: HEADERS,
      timeout: 10000,
    });

    log(
      "backend",
      LOG_LEVELS.INFO,
      "repository",
      "Successfully fetched vehicles data"
    );

    return response.data;
  } catch (err) {
    log(
      "backend",
      LOG_LEVELS.ERROR,
      "repository",
      `Failed to fetch vehicles: ${err.message}`
    );
    throw new Error(`Vehicles API call failed: ${err.message}`);
  }
}

module.exports = { fetchDepots, fetchVehicles };
