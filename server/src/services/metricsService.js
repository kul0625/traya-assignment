function percentile(values, rank) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((rank / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function summarize(results, startedAt, completedAt) {
  const responseTimes = results.map((result) => result.responseTimeMs);
  const total = results.length;
  const failed = results.filter((result) => result.error || result.statusCode >= 400).length;
  const totalDurationMs = Math.max(1, new Date(completedAt) - new Date(startedAt));
  const statusCodes = results.reduce((codes, result) => {
    const key = result.statusCode ? String(result.statusCode) : 'NETWORK_ERROR';
    codes[key] = (codes[key] || 0) + 1;
    return codes;
  }, {});

  return {
    minResponseTimeMs: responseTimes.length ? Math.min(...responseTimes) : null,
    maxResponseTimeMs: responseTimes.length ? Math.max(...responseTimes) : null,
    averageResponseTimeMs: responseTimes.length
      ? Number((responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length).toFixed(2))
      : null,
    p95ResponseTimeMs: percentile(responseTimes, 95),
    statusCodes,
    errorRate: total ? Number(((failed / total) * 100).toFixed(2)) : 0,
    throughput: Number((total / (totalDurationMs / 1000)).toFixed(2)),
    totalDurationMs,
  };
}

module.exports = {
  summarize,
};
