const test = require('node:test');
const assert = require('node:assert/strict');
const { applyFilters } = require('../src/services/filterService');

const records = [
  {
    method: 'GET',
    targetUrl: 'https://api.example.com/users',
    metrics: { errorRate: 5, throughput: 120 },
  },
  {
    method: 'POST',
    targetUrl: 'https://api.example.com/orders',
    metrics: { errorRate: 42, throughput: 30 },
  },
];

test('filters by method and url', () => {
  const result = applyFilters(records, { method: 'GET', url: 'users' });
  assert.equal(result.length, 1);
  assert.equal(result[0].method, 'GET');
});

test('filters by error rate and throughput ranges', () => {
  const result = applyFilters(records, {
    minErrorRate: '30',
    maxThroughput: '50',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].method, 'POST');
});
