function knapsack(capacity, tasks) {
  const n = tasks.length;

  if (n === 0 || capacity <= 0) {
    return { selectedTasks: [], totalImpact: 0, totalDuration: 0 };
  }

  const dp = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const task = tasks[i - 1];
    const dur = task.duration;
    const imp = task.impact;

    for (let w = 0; w <= capacity; w++) {
      if (dur > w) {
        dp[i][w] = dp[i - 1][w];
      } else {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - dur] + imp);
      }
    }
  }

  const selectedTasks = [];
  let w = capacity;

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedTasks.push(tasks[i - 1]);
      w -= tasks[i - 1].duration;
    }
  }

  selectedTasks.reverse();

  const totalImpact = dp[n][capacity];
  const totalDuration = selectedTasks.reduce((sum, t) => sum + t.duration, 0);

  return { selectedTasks, totalImpact, totalDuration };
}

module.exports = { knapsack };
