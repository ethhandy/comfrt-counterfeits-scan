import type { Platform } from '@/lib/types';

export const SCORE_THRESHOLDS = {
  high:    0.8,
  medHigh: 0.6,
  medium:  0.4,
} as const;

export const RISK_TIERS = [
  { label: 'High risk', range: '≥80%',  min: 0.8, max: 1.0, dot: 'bg-slate-900', bar: 'bg-slate-900' },
  { label: 'Med-high',  range: '60–80%', min: 0.6, max: 0.8, dot: 'bg-slate-600', bar: 'bg-slate-600' },
  { label: 'Medium',    range: '40–60%', min: 0.4, max: 0.6, dot: 'bg-slate-300', bar: 'bg-slate-300' },
  { label: 'Low risk',  range: '<40%',   min: 0.0, max: 0.4, dot: 'bg-slate-200', bar: 'bg-slate-200' },
] as const;

export const PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'amazon',  label: 'Amazon' },
  { value: 'ebay',    label: 'eBay' },
];

export const SORT_OPTIONS = [
  { value: 'score', label: 'By Score' },
  { value: 'time',  label: 'By Time' },
] as const;

export const PIPELINE_OVERVIEW = [
  { label: 'Coverage', value: '11 queries × 2 pages' },
  { label: 'Dedupe',   value: 'ASIN / eBay item ID' },
  { label: 'Signals',  value: 'Keywords · brand · image · price · seller' },
  { label: 'Budget',   value: 'Soft cap: 150 requests' },
] as const;
