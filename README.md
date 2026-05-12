# Bustem — Comfrt Infringement Detector

A Next.js app that scans Amazon and eBay for potential Comfrt brand infringements, scores each listing across 6 independent signals, and streams results to the UI in real time.

**Live demo:** https://comfrt-counterfeits-scan.vercel.app/

## Quick Start

```bash
cp .env.example .env.local   # add your ScraperAPI + Gemini API keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Run scan**.

> **Requirements:** Node.js 18+, npm. Two API keys are required — set both in `.env.local`:
> - `SCRAPER_API_KEY` — get one at [scraperapi.com](https://www.scraperapi.com)
> - `GEMINI_API_KEY` — get one at [aistudio.google.com](https://aistudio.google.com)

---

## What It Does

1. **Reference set** — Fetches authentic Comfrt product images from `comfrt.com` and computes perceptual hashes (dHash via `sharp`) as ground truth for visual similarity comparisons.

2. **Query fan-out** — Runs 6 Amazon queries × 2 pages and 5 eBay queries × 2 pages (22 tasks total), interleaved so both platforms compete for concurrency slots from the start. Max 8 requests in-flight; capped at 50 ScraperAPI search calls.

3. **Deduplication** — ASIN / eBay item ID keyed; duplicate listings across queries are skipped before scoring.

4. **6-signal scoring** (weights sum to 1.0):

   | Signal | Weight | What it measures |
   |---|---|---|
   | LLM Analysis | 25% | Gemini 2.0 Flash reasoning across title, brand, and price together |
   | Title Keywords | 20% | Exact brand name, product-type terms, imitation language |
   | Brand Claim | 20% | Brand field claiming or resembling "Comfrt" |
   | Image Hash | 18% | Perceptual (dHash) similarity to authentic product images |
   | Price Anomaly | 12% | Distance from authentic retail range ($59–$169) |
   | Seller Trust | 5% | Seller feedback / rating indicators |

   LLM is only called when the 5 cheap signals already score ≥ 0.20 — listings clearly below that threshold are skipped to avoid unnecessary API calls.

5. **Streaming** — Results appear in the UI via Server-Sent Events as each listing is scored. No waiting for the full scan to finish.

6. **Explainability** — Each result shows the final score, top 3 reasons in plain English, per-signal spark bars, and an LLM analysis panel with the model's quoted reasoning. Expand any row for the full breakdown.

---

## Project Structure

```
app/
  api/scan/route.ts       SSE endpoint — orchestrates the full pipeline
  page.tsx                Root page — layout and state wiring
components/
  scan-header.tsx         Sticky header with live job stats and budget bar
  filter-bar.tsx          Marketplace filter, score threshold slider, sort controls
  results-header.tsx      Column header row (desktop only)
  result-row.tsx          Per-listing row with score pill, spark bars, expandable drawer
  empty-state.tsx         Pre-scan landing state
  pipeline-footer.tsx     Sticky footer with pipeline configuration summary
const/
  scan.ts                 Query lists, concurrency limits, budget constants
  scraper.ts              API base URLs, timeouts, reference set config
  signals.ts              Signal weights, price thresholds, brand terms
  ui.ts                   Pipeline overview labels for the footer
hooks/
  useScanJob.ts           EventSource lifecycle, result accumulation, local elapsed timer
lib/
  types.ts                Shared TypeScript interfaces
  limiter.ts              Concurrency limiter (no external deps)
  dhash.ts                Perceptual hash (dHash) — resize 9×8, grayscale, compare adjacent pixels
  reference.ts            Fetches and hashes authentic Comfrt product images
  scraper.ts              ScraperAPI client for Amazon + eBay (structured + HTML fallback)
  signals.ts              Six scoring signal implementations
  scoring.ts              Combines signals into final weighted probability score
  llm.ts                  Gemini 2.0 Flash client with structured JSON output and 12s timeout
ARCHITECTURE.md           Multi-tenant production evolution plan
DECISIONS.md              Engineering decisions — why, not what
```

---

## Tradeoffs & Decisions

- **LLM pre-screening** — Gemini is only called when the 5 rule-based signals score ≥ 0.20. Listings that clearly don't meet the bar are skipped, cutting LLM calls by ~40–60% on a typical scan with no meaningful loss in detection quality.
- **dHash over CNN embeddings** — Fast, no GPU, runs in-process. Trades accuracy for zero infrastructure overhead. The ARCHITECTURE.md covers the CLIP upgrade path.
- **Separate search vs. image budget** — ScraperAPI search calls are budgeted and gated. Image fetches go directly to CDN hosts and are tracked separately so they cannot starve remaining search tasks.
- **Interleaved task scheduling** — Amazon and eBay tasks are interleaved `[A1, E1, A2, E2, …]` rather than run sequentially. This prevents image scoring of early Amazon results from exhausting the shared budget before eBay tasks start.
- **Graceful signal degradation** — If the LLM call fails or times out, a neutral fallback score (0.35) is used and the weighted sum continues. Same for image hash failures.
- **eBay dual-path** — Uses ScraperAPI's structured eBay endpoint first; falls back to raw HTML scraping with regex if it returns no results. The HTML parser is the most fragile part of the pipeline.
- **No persistence** — Results live in React state only. The ARCHITECTURE.md covers the Postgres data model for production.

See `DECISIONS.md` for the full reasoning behind signal weights, model choice, and pipeline design.
