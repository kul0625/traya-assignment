function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRateLimiter(rateLimitPerSecond) {
  if (!rateLimitPerSecond || rateLimitPerSecond <= 0) {
    return async () => {};
  }

  let nextAvailableAt = Date.now();
  const spacingMs = 1000 / rateLimitPerSecond;

  return async function waitForTurn() {
    const now = Date.now();
    const waitMs = Math.max(0, nextAvailableAt - now);
    nextAvailableAt = Math.max(now, nextAvailableAt) + spacingMs;

    if (waitMs > 0) {
      await sleep(waitMs);
    }
  };
}

module.exports = {
  createRateLimiter,
};
