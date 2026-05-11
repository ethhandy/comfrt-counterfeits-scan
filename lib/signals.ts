import type { SignalResult } from './types';
import { computeDHashFromUrl, hashSimilarity } from './dhash';
import {
  AUTHENTIC_PRICE_RANGE,
  SIGNAL_WEIGHTS,
  BRAND_TERMS,
  PRODUCT_TERMS,
  IMITATION_TERMS,
  PRICE_THRESHOLDS,
  AMAZON_STARS,
  EBAY_FEEDBACK,
  IMAGE_HASH_FALLBACK_SCORE,
  SELLER_DEFAULT_SCORE,
} from '@/const/signals';

export function computeTitleKeywordSignal(title: string): SignalResult {
  const t = title.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  const raw: Record<string, unknown> = {};

  const brandHit = BRAND_TERMS.find((b) => t.includes(b));
  raw.brandHit = brandHit ?? null;
  if (brandHit) {
    score += 0.55;
    reasons.push(`Third-party listing claims to sell Comfrt ("${brandHit}" in title)`);
  }

  const productHits = PRODUCT_TERMS.filter((p) => t.includes(p));
  raw.productHits = productHits;
  if (productHits.length) {
    score += Math.min(0.25, productHits.length * 0.12);
    reasons.push(`Product-type match: ${productHits.slice(0, 2).join(', ')}`);
  }

  const imitationHits = IMITATION_TERMS.filter((i) => t.includes(i));
  raw.imitationHits = imitationHits;
  if (imitationHits.length) {
    score += 0.18;
    reasons.push(`Imitation language: "${imitationHits[0]}"`);
  }

  const normalized = Math.min(1, score);
  raw.rawScore = score;

  const w = SIGNAL_WEIGHTS.titleKeyword;
  return {
    name: 'title_keyword',
    label: 'Title Keywords',
    score: normalized,
    weight: w,
    contribution: normalized * w,
    raw,
    reasoning: reasons.length > 0 ? reasons.join('; ') : 'No significant Comfrt keyword matches in title',
  };
}

export function computeBrandSignal(title: string, brand: string | null): SignalResult {
  const t = title.toLowerCase();
  const b = (brand ?? '').toLowerCase().trim();
  const raw: Record<string, unknown> = { brand };

  let score = 0;
  let reasoning = '';

  if (b === 'comfrt') {
    score = 0.92;
    reasoning = 'Brand field explicitly set to "Comfrt" — unauthorized seller claiming brand';
  } else if (BRAND_TERMS.some((bt) => b.includes(bt))) {
    score = 0.78;
    reasoning = `Brand field contains Comfrt variant: "${brand}"`;
  } else if (!brand && BRAND_TERMS.some((bt) => t.includes(bt))) {
    score = 0.52;
    reasoning = 'No brand specified; title mentions Comfrt — likely unbranded resale';
  } else if (brand && BRAND_TERMS.some((bt) => t.includes(bt))) {
    score = 0.38;
    reasoning = `Third-party brand "${brand}" selling product with Comfrt in title`;
  } else {
    score = 0.02;
    reasoning = 'No connection between brand field and Comfrt';
  }

  raw.score = score;
  const w = SIGNAL_WEIGHTS.brandClaim;
  return {
    name: 'brand_claim',
    label: 'Brand Claim',
    score,
    weight: w,
    contribution: score * w,
    raw,
    reasoning,
  };
}

export function computePriceSignal(price: number | null): SignalResult {
  const { min, max } = AUTHENTIC_PRICE_RANGE;
  const raw: Record<string, unknown> = { price, authenticRange: `$${min}–$${max}` };

  let score: number;
  let reasoning: string;

  if (price === null) {
    score = 0.28;
    reasoning = 'Price unavailable; defaulting to neutral';
  } else if (price < PRICE_THRESHOLDS.extremelyLow) {
    score = 0.92;
    reasoning = `Price $${price.toFixed(2)} is extremely low vs authentic range ($${min}–$${max})`;
  } else if (price < PRICE_THRESHOLDS.veryLow) {
    score = 0.78;
    reasoning = `Price $${price.toFixed(2)} is drastically below authentic range ($${min}–$${max})`;
  } else if (price < min) {
    score = 0.52;
    reasoning = `Price $${price.toFixed(2)} is below authentic retail ($${min}–$${max})`;
  } else if (price <= max) {
    score = 0.10;
    reasoning = `Price $${price.toFixed(2)} falls within authentic retail range ($${min}–$${max})`;
  } else {
    score = 0.05;
    reasoning = `Price $${price.toFixed(2)} exceeds authentic retail; unlikely counterfeit`;
  }

  const w = SIGNAL_WEIGHTS.priceAnomaly;
  return {
    name: 'price_anomaly',
    label: 'Price Anomaly',
    score,
    weight: w,
    contribution: score * w,
    raw,
    reasoning,
  };
}

export async function computeImageHashSignal(
  imageUrl: string | null,
  referenceHashes: string[]
): Promise<SignalResult> {
  const w = SIGNAL_WEIGHTS.imageHash;
  const base = { name: 'image_hash', label: 'Image Similarity', weight: w };

  if (!imageUrl || referenceHashes.length === 0) {
    return {
      ...base,
      score: IMAGE_HASH_FALLBACK_SCORE,
      contribution: IMAGE_HASH_FALLBACK_SCORE * w,
      raw: { available: false },
      reasoning: 'Image similarity unavailable — no image or no reference hashes',
    };
  }

  const hash = await computeDHashFromUrl(imageUrl);
  if (!hash) {
    return {
      ...base,
      score: IMAGE_HASH_FALLBACK_SCORE,
      contribution: IMAGE_HASH_FALLBACK_SCORE * w,
      raw: { available: false, reason: 'Image fetch or hash failed' },
      reasoning: 'Could not fetch or process listing image',
    };
  }

  const similarity = hashSimilarity(hash, referenceHashes);
  return {
    ...base,
    score: similarity,
    contribution: similarity * w,
    raw: { hash, similarity, referenceCount: referenceHashes.length },
    reasoning: `Visual similarity to authentic Comfrt products: ${(similarity * 100).toFixed(0)}%`,
  };
}

export function computeSellerSignal(
  seller: string | null,
  rating: number | null,
  reviewCount: number | null
): SignalResult {
  const raw: Record<string, unknown> = { seller, rating, reviewCount };
  let score = SELLER_DEFAULT_SCORE;
  let reasoning = 'Insufficient seller data for assessment';

  if (rating !== null) {
    const isAmazonStars = rating <= 5;

    if (isAmazonStars) {
      if (rating >= AMAZON_STARS.good && (reviewCount ?? 0) > AMAZON_STARS.minReviews) {
        score = 0.15;
        reasoning = `Well-rated Amazon product (${rating}★, ${reviewCount} reviews) — established listing`;
      } else if (rating >= AMAZON_STARS.average) {
        score = 0.30;
        reasoning = `Average Amazon rating (${rating}★)`;
      } else if (rating < AMAZON_STARS.poor) {
        score = 0.65;
        reasoning = `Low Amazon rating (${rating}★) — poor product quality signals`;
      } else {
        score = SELLER_DEFAULT_SCORE;
        reasoning = `Neutral Amazon rating (${rating}★)`;
      }
    } else {
      if (rating < EBAY_FEEDBACK.highRisk) {
        score = 0.82;
        reasoning = `Low eBay seller feedback (${rating.toFixed(1)}%) — high-risk seller profile`;
      } else if (rating < EBAY_FEEDBACK.belowAvg) {
        score = 0.58;
        reasoning = `Below-average eBay seller feedback (${rating.toFixed(1)}%)`;
      } else if (rating >= EBAY_FEEDBACK.excellent) {
        score = 0.12;
        reasoning = `Excellent eBay seller feedback (${rating.toFixed(1)}%) — established account`;
      } else {
        score = 0.32;
        reasoning = `Average eBay seller feedback (${rating.toFixed(1)}%)`;
      }
    }
  }

  if (seller?.toLowerCase().match(/official|comfrt/)) {
    reasoning += '; Seller name implies official affiliation (unverified)';
  }

  const clamped = Math.min(1, Math.max(0, score));
  const w = SIGNAL_WEIGHTS.sellerTrust;
  return {
    name: 'seller_trust',
    label: 'Seller Trust',
    score: clamped,
    weight: w,
    contribution: clamped * w,
    raw,
    reasoning,
  };
}
