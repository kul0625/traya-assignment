function parseOptionalNumber(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    const error = new Error(`${field} must be a number`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function applyFilters(tests, filters) {
  const method = filters.method ? String(filters.method).toUpperCase() : null;
  const url = filters.url ? String(filters.url).toLowerCase() : null;
  const minErrorRate = parseOptionalNumber(filters.minErrorRate, 'minErrorRate');
  const maxErrorRate = parseOptionalNumber(filters.maxErrorRate, 'maxErrorRate');
  const minThroughput = parseOptionalNumber(filters.minThroughput, 'minThroughput');
  const maxThroughput = parseOptionalNumber(filters.maxThroughput, 'maxThroughput');

  return tests.filter((test) => {
    if (method && test.method !== method) {
      return false;
    }

    if (url && !test.targetUrl.toLowerCase().includes(url)) {
      return false;
    }

    const errorRate = Number(test.metrics?.errorRate || 0);
    const throughput = Number(test.metrics?.throughput || 0);

    if (minErrorRate !== null && errorRate < minErrorRate) {
      return false;
    }

    if (maxErrorRate !== null && errorRate > maxErrorRate) {
      return false;
    }

    if (minThroughput !== null && throughput < minThroughput) {
      return false;
    }

    if (maxThroughput !== null && throughput > maxThroughput) {
      return false;
    }

    return true;
  });
}

module.exports = {
  applyFilters,
};
