import { SCORE_THRESHOLDS } from '@/const/ui';

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface ScoreStyle {
  badge: string;
  bar: string;
  border: string;
}

export function scoreStyle(score: number): ScoreStyle {
  if (score >= SCORE_THRESHOLDS.high)    return { badge: 'bg-slate-900 text-white', bar: 'bg-slate-900', border: 'border-slate-300' };
  if (score >= SCORE_THRESHOLDS.medHigh) return { badge: 'bg-slate-700 text-white', bar: 'bg-slate-700', border: 'border-slate-200' };
  if (score >= SCORE_THRESHOLDS.medium)  return { badge: 'bg-slate-200 text-slate-700', bar: 'bg-slate-400', border: 'border-slate-200' };
  return { badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-200', border: 'border-slate-100' };
}

export function scoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.high)    return 'High Risk';
  if (score >= SCORE_THRESHOLDS.medHigh) return 'Med-High';
  if (score >= SCORE_THRESHOLDS.medium)  return 'Medium';
  return 'Low Risk';
}
