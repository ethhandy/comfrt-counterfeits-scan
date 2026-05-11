export const AMAZON_QUERIES = [
  'comfrt hoodie',
  'comfrt sweatshirt',
  'comfrt minimalist hoodie',
  'comfrt oversized hoodie',
  'comfrt wearable blanket',
  'comfrt clothing brand',
] as const;

export const EBAY_QUERIES = [
  'comfrt hoodie',
  'comfrt sweatshirt',
  'comfrt minimalist hoodie',
  'comfrt brand hoodie',
  'comfrt oversized sweatshirt',
] as const;

export const PAGES_PER_QUERY = 2;
// Hard gate on ScraperAPI search calls (reference + amazon + ebay only).
// Image downloads are direct CDN fetches and are not counted here.
export const SEARCH_BUDGET = 50;

// Display ceiling for the budget bar — ScraperAPI calls only, matches SEARCH_BUDGET with headroom.
export const BUDGET_TOTAL = 60;
export const SEARCH_CONCURRENCY = 8;
export const SCORING_CONCURRENCY = 6;
export const MIN_RESULT_SCORE = 0.20;

export const MAX_LOG_LINES = 200;
export const LOCAL_ELAPSED_INTERVAL_MS = 500;

export const SSE_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};
