const { fetchDepots, fetchVehicles } = require("../repository/depot.repository");
const { knapsack } = require("../utils/knapsack");
const { log, LOG_LEVELS } = require("logging-middleware");

async function computeSchedule() {
  log("backend", LOG_LEVELS.INFO, "service", "Starting schedule computation");

  const [depotsData, vehiclesData] = await Promise.all([
    fetchDepots(),
    fetchVehicles(),
  ]);

  const depots = Array.isArray(depotsData) ? depotsData : depotsData.depots || [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.vehicles || [];

  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Processing ${depots.length} depots and ${vehicles.length} vehicle tasks`
  );

  if (depots.length === 0) {
    log("backend", LOG_LEVELS.WARN, "service", "No depots found — nothing to schedule");
    return { schedules: [], summary: { totalDepots: 0, totalImpact: 0 } };
  }

  const allTasks = vehicles.map((v) => ({
    id: v.TaskID || v.taskId || v.id || v.ID,
    name: v.TaskName || v.taskName || v.name || `Task-${v.TaskID || v.ID}`,
    duration: v.Duration || v.duration || v.time || 0,
    impact: v.Impact || v.impact || v.priority || v.value || 0,
  }));

  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Extracted ${allTasks.length} maintenance tasks from vehicle data`
  );

  const schedules = [];
  let grandTotalImpact = 0;

  for (const depot of depots) {
    const depotId = depot.ID || depot.id || depot.depotId || depot.name;
    const capacity = depot.Mechanichours || depot.mechanicHours || depot.capacity || depot.availableHours || 0;

    log(
      "backend",
      LOG_LEVELS.INFO,
      "service",
      `Processing depot ${depotId} with ${capacity} mechanic hours`
    );

    const result = knapsack(capacity, allTasks);
    grandTotalImpact += result.totalImpact;

    schedules.push({
      depotId,
      depotCapacity: capacity,
      totalTasksAvailable: allTasks.length,
      selectedTasks: result.selectedTasks,
      totalImpact: result.totalImpact,
      totalDurationUsed: result.totalDuration,
      remainingHours: capacity - result.totalDuration,
    });

    log(
      "backend",
      LOG_LEVELS.INFO,
      "service",
      `Depot ${depotId}: selected ${result.selectedTasks.length}/${allTasks.length} tasks, impact=${result.totalImpact}, hours=${result.totalDuration}/${capacity}`
    );
  }

  log(
    "backend",
    LOG_LEVELS.INFO,
    "service",
    `Schedule computation complete. Grand total impact: ${grandTotalImpact}`
  );

  return {
    schedules,
    summary: {
      totalDepots: depots.length,
      totalImpact: grandTotalImpact,
    },
    algorithm: {
      name: "0/1 Knapsack (Dynamic Programming)",
      timeComplexity: "O(n * W) per depot, where n = tasks, W = mechanic hours",
      spaceComplexity: "O(n * W) per depot for the DP table",
      approach:
        "Bottom-up tabulation with backtracking to recover selected tasks. Each depot is solved independently.",
    },
  };
}

module.exports = { computeSchedule };
