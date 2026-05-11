export const AUTHENTIC_PRICE_RANGE = { min: 59, max: 169 } as const;

export const SIGNAL_WEIGHTS = {
  titleKeyword: 0.20,
  brandClaim:   0.20,
  llmAnalysis:  0.25,
  imageHash:    0.18,
  priceAnomaly: 0.12,
  sellerTrust:  0.05,
} as const;

export const BRAND_TERMS = [
  'comfrt',
  'com frt',
  'com-frt',
  'comfrrt',
  'comfrtt',
  'c0mfrt',
  'cumfrt',
  'confrt',
  'c*mfrt',
] as const;

export const PRODUCT_TERMS = [
  'blanket hoodie',
  'blanket sweatshirt',
  'wearable blanket',
  'hoodie blanket',
  'blanket jacket',
] as const;

export const IMITATION_TERMS = [
  'dupe',
  'replica',
  'knockoff',
  'inspired by comfrt',
  'like comfrt',
  'comfrt style',
  'comfrt inspired',
  'similar to comfrt',
] as const;

export const PRICE_THRESHOLDS = {
  extremelyLow: 20,
  veryLow:      40,
} as const;

export const AMAZON_STARS = {
  good:       4.5,
  average:    4.0,
  poor:       3.5,
  minReviews: 100,
} as const;

export const EBAY_FEEDBACK = {
  highRisk:   85,
  belowAvg:   92,
  excellent:  99,
} as const;

export const IMAGE_HASH_FALLBACK_SCORE = 0.28;
export const SELLER_DEFAULT_SCORE = 0.42;
