import type { ScanEvent, RawListing, JobStats } from '@/lib/types';
import { searchAmazon, searchEbay } from '@/lib/scraper';
import { buildReferenceSet } from '@/lib/reference';
import { scoreListing } from '@/lib/scoring';
import { createLimiter } from '@/lib/limiter';
import {
  AMAZON_QUERIES,
  EBAY_QUERIES,
  PAGES_PER_QUERY,
  BUDGET_TOTAL,
  SEARCH_BUDGET,
  SEARCH_CONCURRENCY,
  SCORING_CONCURRENCY,
  MIN_RESULT_SCORE,
  SSE_HEADERS,
} from '@/lib/const/scan';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function sse(event: ScanEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const abortSignal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ScanEvent) => {
        try { controller.enqueue(encoder.encode(sse(event))); } catch { /* client disconnected */ }
      };

      const searchLimit = createLimiter(SEARCH_CONCURRENCY);
      const scoreLimit  = createLimiter(SCORING_CONCURRENCY);
      const startTime   = Date.now();
      const seen        = new Set<string>();

      let searchReqUsed = 0;

      const stats: JobStats = {
        elapsedMs: 0,
        requestCount: { amazon: 0, ebay: 0, image: 0, reference: 0, total: 0 },
        resultCount: 0,
        queriesCompleted: 0,
        queriesTotal: (AMAZON_QUERIES.length + EBAY_QUERIES.length) * PAGES_PER_QUERY,
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
        if (type !== 'image') {
          searchReqUsed += n;
          stats.budgetUsed += n;
        }
        tick();
      };

      const budgetOk = () => searchReqUsed < SEARCH_BUDGET;

      try {
        const refSet = await buildReferenceSet(() => {});
        addReq('reference', refSet.requestsUsed);
        if (abortSignal.aborted) { controller.close(); return; }

        const scoringPromises: Promise<void>[] = [];

        const enqueueScoring = (listings: RawListing[]) => {
          for (const listing of listings) {
            if (seen.has(listing.id)) { stats.deduped++; continue; }
            seen.add(listing.id);
            scoringPromises.push(
              scoreLimit(async () => {
                if (abortSignal.aborted) return;
                if (listing.imageUrl) addReq('image');
                const scored = await scoreListing(listing, refSet.hashes);
                if (scored.finalScore >= MIN_RESULT_SCORE) {
                  stats.resultCount++;
                  send({ type: 'result', data: scored });
                }
                tick();
              })
            );
          }
        };

        const buildSearchTasks = (
          queries: readonly string[],
          platform: 'amazon' | 'ebay',
          fetchFn: (q: string, p: number) => Promise<{ listings: RawListing[]; requestsUsed: number }>
        ) =>
          queries.flatMap((query) =>
            Array.from({ length: PAGES_PER_QUERY }, (_, i) => i + 1).map((page) => async () => {
              if (!budgetOk() || abortSignal.aborted) return;
              addReq(platform, 1);
              const { listings } = await fetchFn(query, page);
              stats.queriesCompleted++;
              enqueueScoring(listings);
              tick();
            })
          );

        const amazonTasks = buildSearchTasks(AMAZON_QUERIES, 'amazon', searchAmazon);
        const ebayTasks   = buildSearchTasks(EBAY_QUERIES,   'ebay',   searchEbay);
        const maxLen      = Math.max(amazonTasks.length, ebayTasks.length);
        const interleaved = Array.from({ length: maxLen }, (_, i) => [
          ...(i < amazonTasks.length ? [amazonTasks[i]] : []),
          ...(i < ebayTasks.length   ? [ebayTasks[i]]   : []),
        ]).flat();

        await Promise.all(interleaved.map((task) => searchLimit(task)));

        await Promise.all(scoringPromises);

        stats.elapsedMs = Date.now() - startTime;
        send({ type: 'done', finalStats: { ...stats } });
        controller.close();
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
