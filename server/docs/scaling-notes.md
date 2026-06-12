# Scaling Notes for 5-10M Requests

The current implementation is intentionally simple for local assessment: one Node.js API process, an in-memory execution queue, and MongoDB persistence for test summaries. To process 5-10M total requests efficiently in production, I would evolve it as follows:

1. Split API and workers
   - API accepts test configurations and stores metadata.
   - Worker nodes execute load tests independently.
   - Workers can scale horizontally with Kubernetes, ECS, Nomad, or autoscaling VM groups.

2. Use a real queue
   - Store test jobs in Redis Queue, BullMQ, RabbitMQ, Kafka, or AWS SQS.
   - Keep retry, priority, dead-letter, and cancellation semantics outside the API process.

3. Scale storage
   - Store test metadata in MongoDB, PostgreSQL, or another indexed operational database.
   - Store high-cardinality request events in ClickHouse, TimescaleDB, BigQuery, or object storage.
   - Keep aggregate metrics in PostgreSQL/Redis for fast status reads.

4. Stream metrics
   - Workers should publish partial aggregates instead of sending every request result to the API.
   - Use rolling histograms or sketches such as HDR Histogram or t-digest for latency percentiles.
   - Persist only sampled raw failures and aggregated status-code buckets.

5. Distributed rate limiting
   - Enforce per-test and per-user rate limits with Redis token buckets.
   - Use worker-local pacing for low-latency request scheduling.

6. Resource protection
   - Cap concurrency per worker.
   - Use backpressure when CPU, memory, sockets, or outbound bandwidth is saturated.
   - Isolate untrusted tests by tenant, worker pool, or network policy.

7. Observability
   - Emit OpenTelemetry traces, Prometheus metrics, and structured logs.
   - Track queue wait time, active tests, worker saturation, request throughput, errors, and target latency.

8. Result retrieval
   - Query summary tables for list/filter pages.
   - Paginate raw request samples and pre-compute common filters such as method, URL, error rate, and throughput.
