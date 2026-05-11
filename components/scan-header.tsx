import type { JobStats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { formatElapsed } from '@/lib/ui-utils';

interface Props {
  isScanning: boolean;
  isDone: boolean;
  stats: JobStats | null;
  localElapsed: number;
  resultCount: number;
  onStart: () => void;
  onStop: () => void;
}

function VDivider() {
  return <div className="w-px h-7 bg-stone-200 shrink-0" />;
}

function StatCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider leading-none">
        {label}
      </span>
      <span className="font-mono text-[13px] font-semibold text-stone-900 leading-none tabular-nums">
        {children}
      </span>
    </div>
  );
}

export function ScanHeader({ isScanning, isDone, stats: s, localElapsed, resultCount, onStart, onStop }: Props) {
  const hasStarted = isScanning || isDone || resultCount > 0;

  if (!hasStarted) {
    return (
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
          <span className="text-[13px] font-semibold text-stone-500">
            Comfrt · no active scan
          </span>
        </div>
      </header>
    );
  }

  const over = s ? s.budgetUsed > s.budgetTotal : false;
  const budgetPct = s ? Math.min(100, (s.budgetUsed / s.budgetTotal) * 100) : 0;

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-5">

        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <span className="relative flex w-2 h-2 shrink-0">
            <span className={`absolute inset-0 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping opacity-75' : 'bg-stone-300'}`} />
            <span className={`relative rounded-full w-2 h-2 ${isScanning ? 'bg-emerald-500' : 'bg-stone-300'}`} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-stone-900 leading-tight">
              Comfrt
              <span className="text-stone-400 font-normal"> · infringement scan</span>
            </p>
            <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
              {s ? (
                <>
                  <span className="sm:hidden">
                    {s.queriesCompleted}/{s.queriesTotal} queries · {resultCount} results
                  </span>
                  <span className="hidden sm:inline">
                    {s.queriesCompleted}/{s.queriesTotal} queries · {s.budgetUsed} req · {resultCount + s.deduped} candidates · {resultCount} scored
                  </span>
                </>
              ) : 'Initialising…'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-5">
          <VDivider />

          <StatCol label="Elapsed">
            {formatElapsed(s?.elapsedMs ?? localElapsed)}
          </StatCol>

          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Budget</span>
              <span className={`font-mono text-[13px] font-semibold tabular-nums ${over ? 'text-red-500' : 'text-stone-900'}`}>
                {s?.budgetUsed ?? 0}
                <span className="text-stone-400 font-normal text-xs">/{s?.budgetTotal ?? 150}</span>
              </span>
            </div>
            <div className="w-20 h-[3px] bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-red-500' : 'bg-stone-800'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>

          <VDivider />

          {s && (
            <div className="hidden lg:flex gap-4 shrink-0">
              {([
                ['Amazon', s.requestCount.amazon, 'bg-[#fef3c7] text-[#7c2d12]'],
                ['eBay',   s.requestCount.ebay,   'bg-[#dbeafe] text-[#1e3a8a]'],
              ] as [string, number, string][]).map(([name, count, cls]) => (
                <div key={name} className="flex flex-col gap-0.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide w-fit ${cls}`}>
                    {name}
                  </span>
                  <span className="font-mono text-[11px] text-stone-500">
                    <span className="font-semibold text-stone-700">{count}</span> req
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2.5 shrink-0">
          {isDone && !isScanning && (
            <span className="hidden sm:inline text-xs text-stone-400 font-medium">Scan complete</span>
          )}
          <Button
            variant={isScanning ? 'secondary' : 'primary'}
            size="sm"
            onClick={isScanning ? onStop : onStart}
          >
            {isScanning ? 'Stop scan' : 'Run again'}
          </Button>
        </div>

      </div>
    </header>
  );
}
