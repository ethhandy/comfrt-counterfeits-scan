export type Platform = 'amazon' | 'ebay';

export interface RawListing {
  id: string;
  platform: Platform;
  title: string;
  price: number | null;
  imageUrl: string | null;
  productUrl: string;
  brand: string | null;
  seller: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface SignalResult {
  name: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  raw: Record<string, unknown>;
  reasoning: string;
}

export interface ScoredListing extends RawListing {
  signals: SignalResult[];
  finalScore: number;
  topReasons: string[];
  scoredAt: number;
}

export interface JobStats {
  elapsedMs: number;
  requestCount: {
    amazon: number;
    ebay: number;
    image: number;
    reference: number;
    total: number;
  };
  resultCount: number;
  queriesCompleted: number;
  queriesTotal: number;
  budgetUsed: number;
  budgetTotal: number;
  deduped: number;
}

export type ScanEvent =
  | { type: 'result'; data: ScoredListing }
  | { type: 'stats'; data: JobStats }
  | { type: 'log'; message: string }
  | { type: 'done'; finalStats: JobStats }
  | { type: 'error'; message: string };
