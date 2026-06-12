# Distributed Load Testing Platform

Node.js MVC backend plus React dashboard for submitting and monitoring concurrent load tests.

## Features

- Submit load tests with URL, HTTP method, headers, payload, request count, concurrency, and per-test rate limit.
- Run multiple load tests concurrently with a global execution queue.
- Track real-time progress while a test is queued, running, completed, or failed.
- Store response-time, status-code, error-rate, and throughput metrics in MongoDB.
- Query/filter tests by HTTP method, URL, error-rate range, and throughput range.
- React UI for creating tests, checking status, and filtering historical results.
- Bonus notes for scaling to 5-10M total requests in [server/docs/scaling-notes.md](server/docs/scaling-notes.md).

## API

### Create Test

`POST /api/tests`

```json
{
  "targetUrl": "https://example.com/api",
  "method": "GET",
  "headers": { "Authorization": "Bearer token" },
  "payload": { "name": "example" },
  "requestCount": 1000,
  "concurrency": 100,
  "rateLimitPerSecond": 250
}
```

### Get Test Status

`GET /api/tests/:id`

### List and Filter Tests

`GET /api/tests?method=GET&url=example&minErrorRate=30&minThroughput=50`

## Run Locally

Install backend dependencies and start the API:

```bash
cd server
npm install
npm run dev
```

Backend: `http://localhost:5000`

MongoDB must be running before starting the backend. By default the API connects to:

```bash
mongodb://127.0.0.1:27017/load-testing-platform
```

Set `MONGODB_URI` if your MongoDB runs somewhere else.

For local configuration, create `server/.env` from `server/.env.example`. The backend loads that file automatically when you run `npm run dev` from the `server` folder.

In a second terminal, install frontend dependencies and start React:

```bash
cd client
npm install
npm run dev
```

React UI: `http://localhost:5173`

## Environment Variables

- `PORT`: backend port, default `5000`
- `MONGODB_URI`: MongoDB connection string, default `mongodb://127.0.0.1:27017/load-testing-platform`
- `MAX_ACTIVE_TESTS`: max simultaneously running tests, default `100`
- `MAX_REQUEST_COUNT`: max requests accepted per test, default `100000`
- `MAX_CONCURRENCY_PER_TEST`: max parallel requests per test, default `1000`
- `REQUEST_TIMEOUT_MS`: per-request timeout, default `30000`
- `DEFAULT_RATE_LIMIT_PER_SECOND`: default per-test rate limit, default `0` for unlimited
