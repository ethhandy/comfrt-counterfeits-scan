# Bustem — Comfrt Infringement Detector

A Next.js app that scans Amazon and eBay for potential Comfrt brand infringements, scores each listing across 5 independent signals, and streams results to the UI in real time.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Start Scan**.

> **Requirements:** Node.js 18+, npm. No additional API keys needed — the ScraperAPI key is bundled as a fallback. Override via `SCRAPER_API_KEY` env var.

---

## What It Does

1. **Reference set**: Fetches authentic Comfrt product images from `comfrt.com` and computes perceptual hashes (dHash via `sharp`) as ground truth.

2. **Query fan-out**: Runs 11 Amazon + 10 eBay search queries (6 Amazon terms × 2 pages, 5 eBay terms × 2 pages) concurrently (max 8 in-flight), within a 120-request budget.

3. **Deduplication**: ASIN / eBay item ID keyed; seen items are skipped.

4. **5-signal scoring** (weights sum to 1.0):

   | Signal | Weight | What it measures |
   |---|---|---|
   | Title Keywords | 35% | Exact brand name, product-type terms, imitation language |
   | Brand Claim | 25% | Brand field claiming/resembling "Comfrt" |
   | Image Hash | 20% | Perceptual (dHash) similarity to authentic product images |
   | Price Anomaly | 15% | Distance from authentic retail range ($79–$159) |
   | Seller Trust | 5% | Seller feedback score indicators |

5. **Streaming**: Results appear in the UI via Server-Sent Events as each listing is scored — no waiting for the full scan.

6. **Explainability**: Each result shows the final score, top 3 reasons in plain English, per-signal bars, and raw values for debugging.

---

## Project Structure

```
app/
  api/scan/route.ts   SSE endpoint — orchestrates the full pipeline
  page.tsx            Client UI with real-time result rendering
lib/
  types.ts            Shared TypeScript interfaces
  limiter.ts          Custom concurrency limiter (no external deps)
  dhash.ts            Perceptual hash (dHash) with sharp
  reference.ts        Fetches/hashes authentic Comfrt images
  scraper.ts          ScraperAPI client for Amazon + eBay
  signals.ts          Five scoring signal implementations
  scoring.ts          Combines signals into final probability score
ARCHITECTURE.md       Multi-tenant production evolution plan
```

---

## Tradeoffs & Decisions

- **dHash over CNN embeddings**: Fast, no GPU required, runs in the Node.js process. Trades accuracy for zero infrastructure overhead. The ARCHITECTURE.md describes the CLIP upgrade path.
- **Graceful signal degradation**: If an image can't be fetched, the image hash signal returns a neutral score (0.28) and the weighted sum continues with the other four signals.
- **ScraperAPI structured endpoints**: Used for Amazon (reliable JSON); eBay falls back to raw HTML scraping with regex if the structured endpoint doesn't return items.
- **No persistence**: Results live in React state only. The ARCHITECTURE.md covers the Postgres + S3 data model for production.
