const { fetchDepots, fetchVehicles } = require("./api.service");
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
    `Processing ${depots.length} depots and ${vehicles.length} vehicles`
  );

  if (depots.length === 0) {
    log("backend", LOG_LEVELS.WARN, "service", "No depots found — nothing to schedule");
    return { schedules: [], summary: { totalDepots: 0, totalImpact: 0 } };
  }

  const schedules = [];
  let grandTotalImpact = 0;

  for (const depot of depots) {
    const depotId = depot.id || depot.depotId || depot.name;
    const capacity = depot.mechanicHours || depot.capacity || depot.availableHours || 0;

    log(
      "backend",
      LOG_LEVELS.INFO,
      "service",
      `Processing depot "${depotId}" with ${capacity} mechanic hours`
    );

    const tasks = [];

    for (const vehicle of vehicles) {
      const vehicleDepot = vehicle.depotId || vehicle.depot || vehicle.depotName;
      if (String(vehicleDepot) !== String(depotId)) continue;

      const vehicleTasks = vehicle.maintenanceTasks || vehicle.tasks || [];

      for (const task of vehicleTasks) {
        tasks.push({
          id: task.id || task.taskId || `${vehicle.id}-${task.name}`,
          vehicleId: vehicle.id || vehicle.vehicleId,
          vehicleName: vehicle.name || vehicle.vehicleId || "Unknown",
          name: task.name || task.taskName || "Unnamed Task",
          duration: task.duration || task.time || 0,
          impact: task.impact || task.priority || task.value || 0,
        });
      }
    }

    log(
      "backend",
      LOG_LEVELS.INFO,
      "service",
      `Depot "${depotId}": ${tasks.length} tasks available, running knapsack with capacity ${capacity}`
    );

    const result = knapsack(capacity, tasks);
    grandTotalImpact += result.totalImpact;

    schedules.push({
      depotId,
      depotCapacity: capacity,
      totalTasksAvailable: tasks.length,
      selectedTasks: result.selectedTasks,
      totalImpact: result.totalImpact,
      totalDurationUsed: result.totalDuration,
      remainingHours: capacity - result.totalDuration,
    });

    log(
      "backend",
      LOG_LEVELS.INFO,
      "service",
      `Depot "${depotId}": selected ${result.selectedTasks.length}/${tasks.length} tasks, impact=${result.totalImpact}, hours=${result.totalDuration}/${capacity}`
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
