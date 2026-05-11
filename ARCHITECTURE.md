# ARCHITECTURE.md

## Scaling to Multi-Tenant

### What changes and why

The prototype runs the entire scan — reference set, search, scoring — inside a single Next.js route handler that holds an SSE connection for up to 5 minutes. That's fine for one user but breaks in three ways at scale: the connection blocks a server thread, there is no persistence (results disappear on refresh or disconnect), and the ScraperAPI budget is a global counter — one client can exhaust credits for everyone else.

The fix is to decouple job execution from the HTTP layer.

---

### Job orchestration

**Queue:** BullMQ + Redis. Scans are medium-duration (up to 5 min), need retries at the task level rather than the job level, and require per-client concurrency caps — all handled natively without a dedicated broker.

```
POST /api/jobs              → validate, enqueue, return { jobId }
Worker (separate process)   → reference set → interleaved search → score → persist
GET  /api/jobs/:id/stream   → lightweight SSE relay backed by Redis pub/sub
```

The worker runs the same internal pipeline that exists today — `buildReferenceSet → buildSearchTasks (interleaved) → enqueueScoring` — but writes each scored result to the DB and publishes to a Redis channel as it arrives. The SSE endpoint becomes a stateless pub/sub relay. A worker crash no longer disconnects the client, and results survive a page refresh.

The existing concurrency limiters (`SEARCH_CONCURRENCY=8`, `SCORING_CONCURRENCY=6`) stay unchanged — they govern per-job parallelism, not cross-job concurrency. Workers scale horizontally; the queue's global concurrency setting controls how many jobs run in parallel across the fleet.

Job lifecycle: `queued → running → done | failed | cancelled`

---

### Rate limiting & per-client isolation

ScraperAPI charges per request and has a shared monthly quota. Per-client isolation is the most important operational concern.

- **Per-client credit budget:** the existing `searchReqUsed / SEARCH_BUDGET` gate in the route is parameterised per client rather than hardcoded. Hard-stop when the allowance is exhausted; surface remaining credits in the dashboard.
- **Per-client job concurrency:** BullMQ's per-queue concurrency prevents a single client from queuing dozens of jobs and saturating the worker fleet. Default: 2 concurrent scans per client.
- **Cross-client query caching:** ScraperAPI responses for `"comfrt hoodie" page=1` are likely identical for multiple clients scanning minutes apart. Cache raw search results in Redis with a 15-minute TTL and skip the API call on a hit. This compounds with the reference set caching below.
- **Tier isolation:** premium clients get a dedicated worker pool; free tier shares a lower-priority pool. One slow free-tier scan cannot delay a paid client's job.

---

### Data model

```sql
brands    (id, client_id, name, queries text[], price_range jsonb,
           ref_hashes text[], ref_hashes_updated_at timestamptz)

jobs      (id, brand_id, status, budget_used int,
           started_at, completed_at, error text)

listings  (id, brand_id, platform, external_id,
           title, price, image_url, product_url,
           first_seen_at, last_seen_at)

scores    (listing_id, job_id, final_score float,
           signals jsonb, top_reasons text[], scored_at)
```

**Key decisions:**

- `ref_hashes` are stored per brand and reused across scans. The prototype rebuilds them on every run (~8–11 ScraperAPI calls each time); at scale this is wasteful. Invalidate only when a brand updates their Shopify catalog (webhook or nightly diff against `comfrt.com/products.json`).
- `listings` are deduplicated by `(brand_id, platform, external_id)`. If a listing's title and price are unchanged since the last scored run, skip re-scoring and reuse the cached result. This cuts image-fetch costs significantly for daily recurring scans — most listings from last week are still there.
- `signals` stored as JSONB — fully queryable for debugging, forward-compatible when new signals are added, no schema migration required per new signal.

---

### Retry strategy & failure handling

The existing codebase already degrades gracefully at the signal level (`IMAGE_HASH_FALLBACK_SCORE` on image failure, no retry). That stays unchanged.

- **Search task failure** (ScraperAPI 5xx / timeout): retry the individual query-page task up to 2× with exponential backoff. One timeout should not abort the whole job — the interleaved task structure already makes each query-page independent.
- **Job-level crash:** BullMQ detects stalled jobs via lock heartbeat and automatically re-queues them. Jobs are idempotent because listings are deduplicated by `external_id` before scoring.
- **Persistent failure:** after max retries, move to a dead-letter queue, alert the client, and allow manual re-queue.
- **eBay HTML parser staleness:** eBay's CSS class names change periodically, which silently breaks the HTML fallback parser. This is not hypothetical — it is the most fragile part of the pipeline. Track `ebay_parse_rate` (listings extracted / pages fetched). A sustained drop below 50% means the regex is stale and needs updating. Treat this as an alert, not a silent empty result.

---

### Observability

**Per-scan** (emit on job completion):

| Metric | Why it matters |
|---|---|
| `scan.duration_ms` | SLA tracking |
| `scan.budget_used` | Cost attribution per client |
| `scan.results_above_threshold` | Quality signal |
| `scan.scraper_success_rate{platform}` | Amazon and eBay behave very differently; track separately |
| `scan.image_hash_success_rate` | Proxy for image CDN availability; silent drop degrades scoring |
| `scan.ebay_parse_rate` | Catches HTML parser rot before clients notice |

**Per-client** (weekly aggregate, surfaced in dashboard):

- ScraperAPI credits consumed vs. allocated; cost per scan
- **Infringement rate trend per brand:** a rising week-over-week trend means the brand is under increasing counterfeit pressure. Proactively alerting clients to this is more valuable than just returning a list of results.

**Alerts:**

- ScraperAPI quota > 80% monthly → warn; > 95% → pause new job submissions and notify ops
- Job stuck in `running` > 12 minutes → worker likely crashed, trigger re-queue
- `ebay_parse_rate` < 50% sustained for 2+ scans → page on-call

---

### Signal evolution path

The five-signal model (title keyword, brand claim, price anomaly, image hash, seller trust) is a practical baseline. As the platform matures:

- **Image embeddings (CLIP):** replace perceptual hash with a sidecar inference service. Far more robust to resizing, colour shifts, and image cropping used to evade exact-match detection.
- **Seller graph:** track seller accounts across jobs. A seller appearing on 3+ scans above threshold gets a persistent elevated prior, regardless of individual listing score.
- **LLM listing analysis:** pass title + description to Claude for euphemistic counterfeit language detection ("inspired by", "same quality as", brand name in alt-text but not title).
- **Historical price tracking:** compare price against a rolling 30-day median for that `external_id`, not just the brand's static MSRP. Counterfeits often start high and drop as they accumulate negative reviews.
