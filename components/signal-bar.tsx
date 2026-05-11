import type { SignalResult } from '@/lib/types';

interface Props {
  signal: SignalResult;
}

export function SignalBar({ signal }: Props) {
  const pct = Math.round(signal.score * 100);
  const contrib = (signal.contribution * 100).toFixed(1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{signal.label}</span>
        <div className="flex items-center gap-1 text-sm text-slate-400 tabular-nums">
          <span>{pct}%</span>
          <span className="text-slate-200">×</span>
          <span>{(signal.weight * 100).toFixed(0)}w</span>
          <span className="text-slate-200">=</span>
          <span className="font-semibold text-slate-700">{contrib}pts</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-800 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-slate-500 leading-snug">{signal.reasoning}</p>
    </div>
  );
}
