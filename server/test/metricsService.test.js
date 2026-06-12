const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../src/services/metricsService');

test('summarizes response times, status codes, errors, and throughput', () => {
  const startedAt = '2026-06-11T10:00:00.000Z';
  const completedAt = '2026-06-11T10:00:02.000Z';
  const metrics = summarize([
    { statusCode: 200, responseTimeMs: 100 },
    { statusCode: 200, responseTimeMs: 200 },
    { statusCode: 500, responseTimeMs: 300 },
    { statusCode: null, responseTimeMs: 400, error: 'ECONNRESET' },
  ], startedAt, completedAt);

  assert.equal(metrics.minResponseTimeMs, 100);
  assert.equal(metrics.maxResponseTimeMs, 400);
  assert.equal(metrics.averageResponseTimeMs, 250);
  assert.equal(metrics.errorRate, 50);
  assert.equal(metrics.throughput, 2);
  assert.deepEqual(metrics.statusCodes, {
    200: 2,
    500: 1,
    NETWORK_ERROR: 1,
  });
});
