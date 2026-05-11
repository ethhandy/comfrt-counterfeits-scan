import { scoreLabel } from '@/lib/ui-utils';
import { SCORE_THRESHOLDS } from '@/const/ui';

interface Props {
  score: number;
}

function badgeClasses(score: number): string {
  if (score >= SCORE_THRESHOLDS.high)    return 'bg-slate-900 text-white';
  if (score >= SCORE_THRESHOLDS.medHigh) return 'bg-slate-700 text-white';
  if (score >= SCORE_THRESHOLDS.medium)  return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-500';
}

export function ScoreBadge({ score }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-semibold ${badgeClasses(score)}`}>
      <span className="tabular-nums">{(score * 100).toFixed(0)}%</span>
      <span className="hidden sm:inline opacity-60 font-medium">{scoreLabel(score)}</span>
    </span>
  );
}
