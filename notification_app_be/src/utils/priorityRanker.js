const { TYPE_IMPORTANCE, DEFAULT_TYPE_WEIGHT } = require("./config");

function computePriorityScore(notification) {
  const type = (notification.Type || notification.type || "general").toLowerCase();
  const typeWeight = TYPE_IMPORTANCE[type] || DEFAULT_TYPE_WEIGHT;

  const createdAt = notification.Timestamp || notification.createdAt || notification.created_at || notification.timestamp;
  const timestamp = createdAt ? new Date(createdAt).getTime() : 0;

  const recencyScore = timestamp / 1_000_000;

  return typeWeight * 1000 + recencyScore;
}

function rankNotifications(notifications, topN = 10) {
  const scored = notifications.map((n) => ({
    ...n,
    _priorityScore: computePriorityScore(n),
  }));

  scored.sort((a, b) => b._priorityScore - a._priorityScore);

  return scored.slice(0, topN);
}

module.exports = { computePriorityScore, rankNotifications };
