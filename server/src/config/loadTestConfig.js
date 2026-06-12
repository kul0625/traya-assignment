module.exports = {
  maxActiveTests: Number(process.env.MAX_ACTIVE_TESTS || 100),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30000),
  defaultRateLimitPerSecond: Number(process.env.DEFAULT_RATE_LIMIT_PER_SECOND || 0),
  maxRequestCount: Number(process.env.MAX_REQUEST_COUNT || 100000),
  maxConcurrencyPerTest: Number(process.env.MAX_CONCURRENCY_PER_TEST || 1000),
};
