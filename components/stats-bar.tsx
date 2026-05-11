import type { JobStats } from '@/lib/types';
import { formatElapsed } from '@/lib/ui-utils';

interface Props {
  stats: JobStats | null;
  localElapsed: number;
  isScanning: boolean;
}

function Divider() {
  return <div className="w-px h-6 bg-stone-200 shrink-0" />;
}

function StatItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider leading-none">
        {label}
      </span>
      <span className="text-sm font-semibold text-stone-900 tabular-nums leading-none font-mono">
        {children}
      </span>
    </div>
  );
}

export function StatsBar({ stats, localElapsed, isScanning }: Props) {
  const s = stats;
  const over = s ? s.budgetUsed > s.budgetTotal : false;
  const budgetPct = s ? Math.min(100, (s.budgetUsed / s.budgetTotal) * 100) : 0;

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-4">

        {/* Status dot */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex w-2 h-2 shrink-0">
            <span
              className={`absolute inset-0 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping opacity-75' : 'bg-stone-300'}`}
            />
            <span
              className={`relative rounded-full w-2 h-2 ${isScanning ? 'bg-emerald-500' : 'bg-stone-300'}`}
            />
          </span>
          <span className="hidden sm:inline text-xs font-medium text-stone-500">
            {isScanning ? 'Scanning' : 'Complete'}
          </span>
        </div>

        <Divider />

        <StatItem label="Elapsed">
          {formatElapsed(s?.elapsedMs ?? localElapsed)}
        </StatItem>

        <Divider />

        <StatItem label="Results">
          <span className="text-stone-900">{s?.resultCount ?? 0}</span>
          {s != null && (
            <span className="text-stone-400 font-normal text-xs ml-1.5">
              · {s.deduped} deduped
            </span>
          )}
        </StatItem>

        <Divider />

        <StatItem label="Queries">
          <span className="text-stone-900">{s?.queriesCompleted ?? 0}</span>
          <span className="text-stone-400 font-normal">/{s?.queriesTotal ?? 0}</span>
        </StatItem>

        <Divider />

        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider leading-none">
            Budget
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold font-mono tabular-nums leading-none ${over ? 'text-red-500' : 'text-stone-900'}`}>
              {s?.budgetUsed ?? 0}
              <span className="text-stone-400 font-normal">/{s?.budgetTotal ?? 150}</span>
            </span>
            <div className="w-20 h-1 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-red-500' : 'bg-stone-800'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        </div>

        {s && (
          <>
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-4 text-xs text-stone-400">
              {([
                ['Amazon',    s.requestCount.amazon],
                ['eBay',      s.requestCount.ebay],
                ['Reference', s.requestCount.reference],
                ['Image',     s.requestCount.image],
              ] as [string, number][]).map(([label, value]) => (
                <span key={label} className="font-mono">
                  {label}{' '}
                  <span className="font-semibold text-stone-600 tabular-nums">{value}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
