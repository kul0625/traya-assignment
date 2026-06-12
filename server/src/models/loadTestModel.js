const crypto = require('crypto');
const config = require('../config/loadTestConfig');

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function validationError(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = details;
  return error;
}

function toPositiveInteger(value, field, max) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw validationError(`${field} must be a positive integer`);
  }

  if (max && parsed > max) {
    throw validationError(`${field} cannot be greater than ${max}`);
  }

  return parsed;
}

function parseUrl(value) {
  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }

    return url.toString();
  } catch (_error) {
    throw validationError('targetUrl must be a valid http or https URL');
  }
}

function parseHeaders(headers) {
  if (headers === undefined || headers === null) {
    return {};
  }

  if (typeof headers !== 'object' || Array.isArray(headers)) {
    throw validationError('headers must be a JSON object of key/value pairs');
  }

  return Object.entries(headers).reduce((result, [key, value]) => {
    if (typeof key !== 'string' || key.trim() === '') {
      throw validationError('header names must be non-empty strings');
    }

    result[key] = String(value);
    return result;
  }, {});
}

function createLoadTest(input) {
  const method = String(input.method || 'GET').toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    throw validationError(`method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}`);
  }

  const requestCount = toPositiveInteger(input.requestCount, 'requestCount', config.maxRequestCount);
  const concurrency = toPositiveInteger(input.concurrency, 'concurrency', config.maxConcurrencyPerTest);
  const rateLimitPerSecond = input.rateLimitPerSecond === undefined || input.rateLimitPerSecond === null || input.rateLimitPerSecond === ''
    ? config.defaultRateLimitPerSecond
    : Number(input.rateLimitPerSecond);

  if (!Number.isFinite(rateLimitPerSecond) || rateLimitPerSecond < 0) {
    throw validationError('rateLimitPerSecond must be a non-negative number');
  }

  return {
    id: crypto.randomUUID(),
    targetUrl: parseUrl(input.targetUrl),
    method,
    headers: parseHeaders(input.headers),
    payload: input.payload ?? null,
    requestCount,
    concurrency: Math.min(concurrency, requestCount),
    rateLimitPerSecond,
    status: 'queued',
    progress: {
      total: requestCount,
      completed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
    },
    metrics: {
      minResponseTimeMs: null,
      maxResponseTimeMs: null,
      averageResponseTimeMs: null,
      p95ResponseTimeMs: null,
      statusCodes: {},
      errorRate: 0,
      throughput: 0,
      totalDurationMs: 0,
    },
    requestErrors: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  createLoadTest,
};
