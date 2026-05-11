import type { ScanEvent, RawListing, JobStats } from '@/lib/types';
import { searchAmazon, searchEbay } from '@/lib/scraper';
import { buildReferenceSet } from '@/lib/reference';
import { scoreListing } from '@/lib/scoring';
import { createLimiter } from '@/lib/limiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// ── Query plan ────────────────────────────────────────────────────────────────

const AMAZON_QUERIES = [
  'comfrt hoodie',
  'comfrt sweatshirt',
  'comfrt minimalist hoodie',
  'comfrt oversized hoodie',
  'comfrt wearable blanket',
  'comfrt clothing brand',
];

const EBAY_QUERIES = [
  'comfrt hoodie',
  'comfrt sweatshirt',
  'comfrt minimalist hoodie',
  'comfrt brand hoodie',
  'comfrt oversized sweatshirt',
];

const PAGES_PER_QUERY = 2;
const BUDGET_TOTAL = 150; // soft cap; image fetches are lightweight but we track them
const SEARCH_CONCURRENCY = 8;   // concurrent search requests
const SCORING_CONCURRENCY = 6;  // concurrent image-hash jobs

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sse(event: ScanEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ── Main job ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const abortSignal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ScanEvent) => {
        try {
          controller.enqueue(encoder.encode(sse(event)));
        } catch {
          // controller closed (client disconnected)
        }
      };

      const log = (msg: string) => send({ type: 'log', message: msg });

      const searchLimit = createLimiter(SEARCH_CONCURRENCY);
      const scoreLimit = createLimiter(SCORING_CONCURRENCY);
      const startTime = Date.now();

      const seen = new Set<string>();
      const stats: JobStats = {
        elapsedMs: 0,
        requestCount: { amazon: 0, ebay: 0, image: 0, reference: 0, total: 0 },
        resultCount: 0,
        queriesCompleted: 0,
        queriesTotal:
          AMAZON_QUERIES.length * PAGES_PER_QUERY +
          EBAY_QUERIES.length * PAGES_PER_QUERY,
        budgetUsed: 0,
        budgetTotal: BUDGET_TOTAL,
        deduped: 0,
      };

      const tick = () => {
        stats.elapsedMs = Date.now() - startTime;
        send({ type: 'stats', data: { ...stats } });
      };

      const addReq = (type: 'amazon' | 'ebay' | 'image' | 'reference', n = 1) => {
        stats.requestCount[type] += n;
        stats.requestCount.total += n;
        stats.budgetUsed += n;
        tick();
      };

      const budgetOk = () => stats.budgetUsed < BUDGET_TOTAL;

      try {
        // ── Phase 1: Build reference set ─────────────────────────────────────
        const refSet = await buildReferenceSet(log);
        addReq('reference', refSet.requestsUsed);

        if (abortSignal.aborted) { controller.close(); return; }

        // ── Phase 2: Fan-out ALL searches (Amazon + eBay) concurrently ───────
        // Collect unique raw listings first — do NOT block on image hashing yet.
        const rawListings: RawListing[] = [];

        const buildSearchTasks = (
          queries: string[],
          platform: 'amazon' | 'ebay',
          fetchFn: (q: string, p: number) => Promise<{ listings: RawListing[]; requestsUsed: number }>
        ) =>
          queries.flatMap((query) =>
            Array.from({ length: PAGES_PER_QUERY }, (_, i) => i + 1).map(
              (page) => async () => {
                if (!budgetOk() || abortSignal.aborted) return;
                log(`${platform === 'amazon' ? 'Amazon' : 'eBay'}: "${query}" p${page}`);
                const { listings, requestsUsed } = await fetchFn(query, page);
                addReq(platform, requestsUsed);
                stats.queriesCompleted++;

                for (const l of listings) {
                  if (seen.has(l.id)) { stats.deduped++; continue; }
                  seen.add(l.id);
                  rawListings.push(l);
                }
                tick();
              }
            )
          );

        const allSearchTasks = [
          ...buildSearchTasks(AMAZON_QUERIES, 'amazon', searchAmazon),
          ...buildSearchTasks(EBAY_QUERIES, 'ebay', searchEbay),
        ];

        await Promise.all(allSearchTasks.map((task) => searchLimit(task)));

        log(
          `Search complete — ${rawListings.length} unique listings (${stats.deduped} deduped). Scoring…`
        );

        // Shuffle so eBay and Amazon listings are interleaved — prevents Amazon
        // exhausting the image-fetch budget before eBay results are scored.
        for (let i = rawListings.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rawListings[i], rawListings[j]] = [rawListings[j], rawListings[i]];
        }

        // ── Phase 3: Score all listings in parallel (streams results progressively) ──
        // Listings are scored with image hashing; each emits a result as it finishes.
        await Promise.all(
          rawListings.map((listing) =>
            scoreLimit(async () => {
              if (!budgetOk() || abortSignal.aborted) return;

              const scored = await scoreListing(listing, refSet.hashes);

              if (listing.imageUrl) addReq('image');

              if (scored.finalScore >= 0.20) {
                stats.resultCount++;
                send({ type: 'result', data: scored });
              }
              tick();
            })
          )
        );

        // ── Done ──────────────────────────────────────────────────────────────
        stats.elapsedMs = Date.now() - startTime;
        log(
          `Done — ${stats.resultCount} results surfaced, ${stats.deduped} deduped, ${stats.budgetUsed}/${BUDGET_TOTAL} requests used`
        );
        send({ type: 'done', finalStats: { ...stats } });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
