/**
 * Five independent scoring signals.
 * Each returns a SignalResult with score ∈ [0,1], weight, and a human-readable reasoning string.
 *
 * Weights must sum to 1.0.
 *   title_keyword  0.35
 *   brand_claim    0.25
 *   image_hash     0.20
 *   price_anomaly  0.15
 *   seller_trust   0.05
 */

import type { SignalResult } from './types';
import { computeDHashFromUrl, hashSimilarity } from './dhash';
import { AUTHENTIC_PRICE_RANGE } from './reference';

// ── Signal 1: Title Keyword Analysis ─────────────────────────────────────────

const BRAND_TERMS = ['comfrt', 'com frt', 'comfrrt', 'c0mfrt'];
const PRODUCT_TERMS = [
  'blanket hoodie',
  'blanket sweatshirt',
  'wearable blanket',
  'hoodie blanket',
  'blanket jacket',
];
const IMITATION_TERMS = [
  'dupe',
  'replica',
  'knockoff',
  'inspired by comfrt',
  'like comfrt',
  'comfrt style',
  'comfrt inspired',
  'similar to comfrt',
];

export function computeTitleKeywordSignal(title: string): SignalResult {
  const t = title.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  const raw: Record<string, unknown> = {};

  const brandHit = BRAND_TERMS.find((b) => t.includes(b));
  raw.brandHit = brandHit ?? null;
  if (brandHit) {
    score += 0.55;
    reasons.push(`Title contains brand term "${brandHit}"`);
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

  return {
    name: 'title_keyword',
    label: 'Title Keywords',
    score: normalized,
    weight: 0.35,
    contribution: normalized * 0.35,
    raw,
    reasoning:
      reasons.length > 0
        ? reasons.join('; ')
        : 'No significant Comfrt keyword matches in title',
  };
}

// ── Signal 2: Brand Claim Analysis ───────────────────────────────────────────

export function computeBrandSignal(
  title: string,
  brand: string | null
): SignalResult {
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
  return {
    name: 'brand_claim',
    label: 'Brand Claim',
    score,
    weight: 0.25,
    contribution: score * 0.25,
    raw,
    reasoning,
  };
}

// ── Signal 3: Price Anomaly ───────────────────────────────────────────────────

export function computePriceSignal(price: number | null): SignalResult {
  const { min, max } = AUTHENTIC_PRICE_RANGE;
  const raw: Record<string, unknown> = { price, authenticRange: `$${min}–$${max}` };

  let score: number;
  let reasoning: string;

  if (price === null) {
    score = 0.28;
    reasoning = 'Price unavailable; defaulting to neutral';
  } else if (price < 20) {
    score = 0.92;
    reasoning = `Price $${price.toFixed(2)} is extremely low vs authentic range ($${min}–$${max})`;
  } else if (price < 40) {
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

  return {
    name: 'price_anomaly',
    label: 'Price Anomaly',
    score,
    weight: 0.15,
    contribution: score * 0.15,
    raw,
    reasoning,
  };
}

// ── Signal 4: Image Perceptual Hash ──────────────────────────────────────────

export async function computeImageHashSignal(
  imageUrl: string | null,
  referenceHashes: string[]
): Promise<SignalResult> {
  const base = {
    name: 'image_hash',
    label: 'Image Similarity',
    weight: 0.20,
  };

  if (!imageUrl || referenceHashes.length === 0) {
    return {
      ...base,
      score: 0.28,
      contribution: 0.28 * 0.20,
      raw: { available: false },
      reasoning: 'Image similarity unavailable — no image or no reference hashes',
    };
  }

  const hash = await computeDHashFromUrl(imageUrl);
  if (!hash) {
    return {
      ...base,
      score: 0.28,
      contribution: 0.28 * 0.20,
      raw: { available: false, reason: 'Image fetch or hash failed' },
      reasoning: 'Could not fetch or process listing image',
    };
  }

  const similarity = hashSimilarity(hash, referenceHashes);

  return {
    ...base,
    score: similarity,
    contribution: similarity * 0.20,
    raw: {
      hash,
      similarity,
      referenceCount: referenceHashes.length,
    },
    reasoning: `Visual similarity to authentic Comfrt products: ${(similarity * 100).toFixed(0)}%`,
  };
}

// ── Signal 5: Seller Trust Indicators ────────────────────────────────────────

export function computeSellerSignal(
  seller: string | null,
  rating: number | null,
  reviewCount: number | null
): SignalResult {
  const raw: Record<string, unknown> = { seller, rating, reviewCount };
  let score = 0.42;
  let reasoning = 'Insufficient seller data for assessment';

  if (rating !== null) {
    // Distinguish Amazon product stars (≤5) from eBay feedback % (>5)
    const isAmazonStars = rating <= 5;

    if (isAmazonStars) {
      // Amazon star rating: 4.5★ = well-rated product (established seller)
      const stars = rating;
      if (stars >= 4.5 && (reviewCount ?? 0) > 100) {
        score = 0.15;
        reasoning = `Well-rated Amazon product (${stars}★, ${reviewCount} reviews) — established listing`;
      } else if (stars >= 4.0) {
        score = 0.30;
        reasoning = `Average Amazon rating (${stars}★)`;
      } else if (stars < 3.5) {
        score = 0.65;
        reasoning = `Low Amazon rating (${stars}★) — poor product quality signals`;
      } else {
        score = 0.42;
        reasoning = `Neutral Amazon rating (${stars}★)`;
      }
    } else {
      // eBay feedback percentage
      if (rating < 85) {
        score = 0.82;
        reasoning = `Low eBay seller feedback (${rating.toFixed(1)}%) — high-risk seller profile`;
      } else if (rating < 92) {
        score = 0.58;
        reasoning = `Below-average eBay seller feedback (${rating.toFixed(1)}%)`;
      } else if (rating >= 99) {
        score = 0.12;
        reasoning = `Excellent eBay seller feedback (${rating.toFixed(1)}%) — established account`;
      } else {
        score = 0.32;
        reasoning = `Average eBay seller feedback (${rating.toFixed(1)}%)`;
      }
    }
  }

  if (seller) {
    const sl = seller.toLowerCase();
    if (sl.includes('official') || sl.includes('comfrt')) {
      reasoning += '; Seller name implies official affiliation (unverified)';
    }
  }

  const clamped = Math.min(1, Math.max(0, score));
  return {
    name: 'seller_trust',
    label: 'Seller Trust',
    score: clamped,
    weight: 0.05,
    contribution: clamped * 0.05,
    raw,
    reasoning,
  };
}
