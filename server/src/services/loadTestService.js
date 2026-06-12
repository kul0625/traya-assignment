const repository = require('../repositories/testRepository');
const { createLoadTest } = require('../models/loadTestModel');
const metricsService = require('./metricsService');
const filterService = require('./filterService');
const { createRateLimiter } = require('./rateLimiterService');
const config = require('../config/loadTestConfig');
const testEventService = require('./testEventService');

const activeTests = new Set();
const queuedTests = [];

async function createTest(input) {
  const test = createLoadTest(input);
  const createdTest = await repository.create(test);
  queuedTests.push(test.id);
  testEventService.publish(createdTest);
  drainQueue();
  return createdTest;
}

async function getTest(id) {
  return repository.findById(id);
}

async function listTests(filters) {
  const tests = await repository.findAll();
  return filterService.applyFilters(tests, filters);
}

function drainQueue() {
  while (activeTests.size < config.maxActiveTests && queuedTests.length > 0) {
    const testId = queuedTests.shift();
    activeTests.add(testId);
    runTest(testId)
      .catch(async (error) => {
        const failedTest = await repository.update(testId, {
          status: 'failed',
          requestErrors: [{ message: error.message, occurredAt: new Date().toISOString() }],
          completedAt: new Date().toISOString(),
        });
        testEventService.publish(failedTest);
      })
      .finally(() => {
        activeTests.delete(testId);
        drainQueue();
      });
  }
}

async function runTest(testId) {
  const test = await repository.findById(testId);

  if (!test) {
    return;
  }

  const startedAt = new Date().toISOString();
  const runningTest = await repository.update(testId, { status: 'running', startedAt });
  testEventService.publish(runningTest);

  const results = [];
  let nextRequestNumber = 0;
  const waitForRateLimit = createRateLimiter(test.rateLimitPerSecond);

  async function worker() {
    while (nextRequestNumber < test.requestCount) {
      nextRequestNumber += 1;
      await waitForRateLimit();
      const result = await executeRequest(test);
      results.push(result);

      const completed = results.length;
      const failed = results.filter((item) => item.error || item.statusCode >= 400).length;
      const successful = completed - failed;

      if (completed === test.requestCount || completed % Math.max(1, Math.floor(test.requestCount / 50)) === 0) {
        const updatedTest = await repository.update(testId, {
          progress: {
            total: test.requestCount,
            completed,
            successful,
            failed,
            percentage: Number(((completed / test.requestCount) * 100).toFixed(2)),
          },
          requestErrors: collectSampleErrors(results),
        });
        testEventService.publish(updatedTest);
      }
    }
  }

  const workers = Array.from({ length: test.concurrency }, () => worker());
  await Promise.all(workers);

  const completedAt = new Date().toISOString();
  const metrics = metricsService.summarize(results, startedAt, completedAt);

  const completedTest = await repository.update(testId, {
    status: 'completed',
    progress: {
      total: test.requestCount,
      completed: test.requestCount,
      successful: test.requestCount - results.filter((item) => item.error || item.statusCode >= 400).length,
      failed: results.filter((item) => item.error || item.statusCode >= 400).length,
      percentage: 100,
    },
    metrics,
    requestErrors: collectSampleErrors(results),
    completedAt,
  });
  testEventService.publish(completedTest);
}

async function executeRequest(test) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const options = {
      method: test.method,
      headers: { ...(test.headers || {}) },
      signal: controller.signal,
    };

    if (!['GET'].includes(test.method) && test.payload !== null && test.payload !== undefined) {
      options.body = typeof test.payload === 'string' ? test.payload : JSON.stringify(test.payload);

      if (!Object.keys(options.headers).some((name) => name.toLowerCase() === 'content-type')) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(test.targetUrl, options);
    await response.arrayBuffer();

    return {
      statusCode: response.status,
      responseTimeMs: Number((performance.now() - started).toFixed(2)),
    };
  } catch (error) {
    return {
      statusCode: null,
      responseTimeMs: Number((performance.now() - started).toFixed(2)),
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectSampleErrors(results) {
  return results
    .filter((result) => result.error || result.statusCode >= 400)
    .slice(-10)
    .map((result) => ({
      statusCode: result.statusCode,
      message: result.error || `HTTP ${result.statusCode}`,
      responseTimeMs: result.responseTimeMs,
      occurredAt: new Date().toISOString(),
    }));
}

module.exports = {
  createTest,
  getTest,
  listTests,
};
