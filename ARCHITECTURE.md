# Architecture: Multi-Tenant Infringement Detection Platform

## Current State → Production Path

The take-home runs as a single Next.js process. Scaling to hundreds of clients requires separating the per-request pipeline into durable, isolated units of work.

---

## Job Orchestration

**Model: queue + worker pool**

```
Client request
    │
    ▼
API Gateway  ──►  Job Queue (Redis / BullMQ)
                       │  enqueue(jobSpec)
                       ▼
                  Worker Pool (Kubernetes pods, auto-scaled)
                       │  each worker picks one job at a time
                       ▼
                  Pipeline stages (fan-out tasks per query)
                       │
                       ▼
                  Result Store (Postgres + S3)
                       │
                       ▼
                  SSE / webhook push to client
```

- **Job spec** includes: `clientId`, `brandProfileId`, `queries[]`, `platforms[]`, `budget`, `callbackUrl`
- Workers are **stateless**; all state lives in the store — workers can crash and restart without losing progress
- Each stage (search, score, image-hash) is its own queue entry, enabling fine-grained retry and parallelism

---

## Rate Limiting & Per-Client Isolation

| Layer | Mechanism |
|---|---|
| Inbound API | Token-bucket per `clientId` at the gateway (e.g., 10 jobs/hour) |
| Scraper calls | Per-client semaphore in Redis (`SETNX` + TTL) limiting concurrent outbound requests |
| Budget enforcement | Hard cap stored in job record; worker checks before each request and atomically decrements |
| Platform quotas | Separate queues per platform (Amazon / eBay) with their own concurrency limits, so one slow platform doesn't starve another |

Client data is never shared: each job's results, artifacts, and logs are namespaced by `clientId` in both Postgres and S3.

---

## Data Model

**Postgres tables**

| Table | Key columns |
|---|---|
| `jobs` | `id`, `client_id`, `status`, `created_at`, `completed_at`, `budget_used`, `request_breakdown` (JSONB) |
| `listings` | `id`, `job_id`, `platform`, `listing_id`, `title`, `price`, `image_url`, `final_score`, `signals` (JSONB) |
| `brand_profiles` | `id`, `client_id`, `name`, `reference_image_urls[]`, `product_names[]`, `price_range` |

**S3 buckets**

- `reference-images/{clientId}/{brandId}/` — authentic product images + precomputed hashes
- `listing-images/{jobId}/{listingId}` — cached listing thumbnails (TTL 7 days)

---

## Retry Strategy & Failure Handling

- **Transient scraper failure** (timeout, 429): exponential backoff with jitter, max 3 retries per task; after 3 failures the task is marked `skipped` and remaining signals are re-weighted proportionally
- **Image hash failure**: signal degrades gracefully — weight redistributed to the other four signals, `image_hash.available = false` surfaced in the result
- **Worker crash**: BullMQ `removeOnComplete: false` keeps the job in the queue; another worker picks it up; idempotency key (`listingId + jobId`) prevents double-scoring
- **Budget exceeded**: job is marked `budget_exhausted`, partial results are written and surfaced to the client immediately
- **Full job timeout** (5 min wall clock): soft timeout triggers a graceful flush of in-progress results before the job closes

---

## Observability

**Metrics to track (Prometheus / Datadog)**

| Metric | Why |
|---|---|
| `job_duration_seconds{client, status}` | SLA tracking per client |
| `requests_per_job{platform}` | Budget efficiency; detect scraper rate-limit increases |
| `score_distribution{client, bucket}` | Catch drift in signal quality over time |
| `signal_failure_rate{signal_name}` | Detect image CDN outages or scraper schema changes |
| `queue_depth{queue_name}` | Auto-scale trigger for worker pods |
| `dedup_ratio` | Effectiveness of query diversity |

**Structured logs** (JSON to CloudWatch / Loki): every `result` event includes `jobId`, `clientId`, `listingId`, signal scores, and latency breakdowns — enabling per-client audit trails and model retraining datasets.

---

## Signal Evolution

As the platform matures, heavier signals become feasible:

- **Image embeddings** (CLIP via a sidecar service): replaces perceptual hash, much more robust to resizing/color shifts
- **LLM description analysis**: call Claude API on listing text to detect euphemistic counterfeit language
- **Seller graph**: track seller accounts across jobs; a seller flagged on 3+ jobs gets a persistent risk score
- **Historical price tracking**: compare price against rolling 30-day median for that ASIN, not just the brand's MSRP
