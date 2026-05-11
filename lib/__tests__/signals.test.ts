import { describe, it, expect } from 'vitest';
import { computePriceSignal, computeTitleKeywordSignal, computeBrandSignal } from '../signals';

describe('computePriceSignal', () => {
  it('returns high score for extremely low price (under $20)', () => {
    const r = computePriceSignal(11.99);
    expect(r.score).toBeGreaterThanOrEqual(0.9);
    expect(r.contribution).toBeCloseTo(r.score * r.weight);
  });

  it('returns high score for very low price ($20–$40)', () => {
    const r = computePriceSignal(29.99);
    expect(r.score).toBeGreaterThanOrEqual(0.7);
    expect(r.score).toBeLessThan(0.9);
  });

  it('returns medium score for price below authentic range ($40–$59)', () => {
    const r = computePriceSignal(49.00);
    expect(r.score).toBeGreaterThanOrEqual(0.4);
    expect(r.score).toBeLessThan(0.7);
  });

  it('returns low score for price within authentic range ($59–$169)', () => {
    const r = computePriceSignal(99.00);
    expect(r.score).toBeLessThan(0.2);
  });

  it('returns very low score for price above authentic range', () => {
    const r = computePriceSignal(200.00);
    expect(r.score).toBeLessThan(0.1);
  });

  it('returns neutral score when price is null', () => {
    const r = computePriceSignal(null);
    expect(r.score).toBeGreaterThan(0.2);
    expect(r.score).toBeLessThan(0.4);
  });

  it('clamps contribution to score × weight', () => {
    const r = computePriceSignal(5.00);
    expect(r.contribution).toBeCloseTo(r.score * r.weight, 5);
  });

  it('includes the price in the reasoning string', () => {
    const r = computePriceSignal(14.99);
    expect(r.reasoning).toContain('14.99');
  });
});

describe('computeTitleKeywordSignal', () => {
  it('gives high score when exact brand name appears in title', () => {
    const r = computeTitleKeywordSignal('Comfrt Hoodie Blanket Oversized Women');
    expect(r.score).toBeGreaterThanOrEqual(0.5);
  });

  it('detects brand variant spellings (c0mfrt)', () => {
    const r = computeTitleKeywordSignal('C0mfrt Wearable Blanket Hoodie');
    expect(r.score).toBeGreaterThan(0);
    expect(r.raw).toMatchObject({ brandHit: 'c0mfrt' });
  });

  it('detects product-type match even without brand term', () => {
    const r = computeTitleKeywordSignal('Wearable Blanket Oversized Pullover Sweatshirt');
    expect(r.score).toBeGreaterThan(0);
    expect((r.raw as Record<string, unknown>).productHits).not.toHaveLength(0);
  });

  it('detects imitation language', () => {
    const r = computeTitleKeywordSignal('Blanket Hoodie Dupe Oversized Sweatshirt');
    expect(r.score).toBeGreaterThan(0);
    expect((r.raw as Record<string, unknown>).imitationHits).not.toHaveLength(0);
  });

  it('returns near-zero score for unrelated listing', () => {
    const r = computeTitleKeywordSignal('Men\'s Running Shoes Lightweight Mesh Size 10');
    expect(r.score).toBe(0);
  });

  it('caps score at 1.0 regardless of multiple hits', () => {
    const r = computeTitleKeywordSignal('Comfrt comfrt dupe blanket hoodie wearable blanket hoodie blanket');
    expect(r.score).toBeLessThanOrEqual(1.0);
  });

  it('is case-insensitive', () => {
    const lower = computeTitleKeywordSignal('comfrt blanket hoodie');
    const upper = computeTitleKeywordSignal('COMFRT BLANKET HOODIE');
    expect(lower.score).toBe(upper.score);
  });
});

describe('computeBrandSignal', () => {
  it('gives highest score when brand field is exactly "Comfrt"', () => {
    const r = computeBrandSignal('Comfrt Cloud Hoodie', 'Comfrt');
    expect(r.score).toBeGreaterThanOrEqual(0.9);
  });

  it('gives high score when brand field contains a Comfrt variant', () => {
    const r = computeBrandSignal('Blanket Hoodie', 'C0mfrt');
    expect(r.score).toBeGreaterThanOrEqual(0.7);
  });

  it('gives medium score when brand is null but title mentions Comfrt', () => {
    const r = computeBrandSignal('Comfrt Style Blanket Hoodie', null);
    expect(r.score).toBeGreaterThan(0.4);
    expect(r.score).toBeLessThan(0.7);
  });

  it('gives lower score when a third-party brand claims Comfrt in title', () => {
    const r = computeBrandSignal('Comfrt Lookalike Blanket Hoodie', 'SomeBrand');
    expect(r.score).toBeGreaterThan(0.2);
    expect(r.score).toBeLessThan(0.5);
  });

  it('gives minimal score when no Comfrt connection exists', () => {
    const r = computeBrandSignal('Oversized Sherpa Hoodie', 'PolarFleece');
    expect(r.score).toBeLessThan(0.1);
  });

  it('contribution equals score × weight', () => {
    const r = computeBrandSignal('Comfrt Cloud Hoodie', 'Comfrt');
    expect(r.contribution).toBeCloseTo(r.score * r.weight, 5);
  });
});
