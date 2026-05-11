'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScoredListing, JobStats, ScanEvent, SignalResult } from '@/lib/types';

// ── Utility helpers ────────────────────────────────────────────────────────────

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function scoreStyle(score: number): { badge: string; bar: string; border: string } {
  if (score >= 0.8) return { badge: 'bg-red-100 text-red-800', bar: 'bg-red-500', border: 'border-red-200' };
  if (score >= 0.6) return { badge: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500', border: 'border-orange-200' };
  if (score >= 0.4) return { badge: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500', border: 'border-yellow-200' };
  return { badge: 'bg-green-100 text-green-800', bar: 'bg-green-500', border: 'border-green-200' };
}

function scoreLabel(score: number) {
  if (score >= 0.8) return 'High Risk';
  if (score >= 0.6) return 'Med-High';
  if (score >= 0.4) return 'Medium';
  return 'Low Risk';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const st = scoreStyle(score);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.badge}`}>
      {(score * 100).toFixed(0)}%
      <span className="opacity-70">{scoreLabel(score)}</span>
    </span>
  );
}

function PlatformBadge({ platform }: { platform: 'amazon' | 'ebay' }) {
  return platform === 'amazon' ? (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
      Amazon
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
      eBay
    </span>
  );
}

function SignalBar({ signal }: { signal: SignalResult }) {
  const pct = Math.round(signal.score * 100);
  const contrib = (signal.contribution * 100).toFixed(1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{signal.label}</span>
        <span className="text-gray-500">
          {pct}% × {(signal.weight * 100).toFixed(0)}% = <span className="font-semibold text-gray-800">{contrib}pts</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 leading-tight">{signal.reasoning}</p>
    </div>
  );
}

function ResultRow({ result, rank }: { result: ScoredListing; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const st = scoreStyle(result.finalScore);

  return (
    <div className={`border rounded-lg overflow-hidden ${st.border} bg-white`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        <span className="text-xs text-gray-400 w-5 text-right shrink-0">{rank}</span>

        {/* Thumbnail */}
        <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {result.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span className="text-gray-400 text-xs">No img</span>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <a
            href={result.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:underline leading-tight block truncate"
          >
            {result.title}
          </a>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <PlatformBadge platform={result.platform} />
            {result.brand && (
              <span className="text-xs text-gray-500">Brand: <span className="font-medium">{result.brand}</span></span>
            )}
            {result.price != null && (
              <span className="text-xs text-gray-600">${result.price.toFixed(2)}</span>
            )}
            {result.seller && (
              <span className="text-xs text-gray-400">Seller: {result.seller}</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <ScoreBadge score={result.finalScore} />
          {/* Score bar */}
          <div className="w-20 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${result.finalScore * 100}%` }} />
          </div>
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {expanded ? 'Hide' : 'Why?'}
        </button>
      </div>

      {/* Expanded signal breakdown */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Top reasons */}
          {result.topReasons.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Reasons</h4>
              <ul className="space-y-1">
                {result.topReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signal breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Signal Breakdown</h4>
            <div className="space-y-3">
              {result.signals.map((sig) => (
                <SignalBar key={sig.name} signal={sig} />
              ))}
            </div>
          </div>

          {/* Raw values (collapsible) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Raw signal values</summary>
            <div className="mt-2 space-y-2">
              {result.signals.map((sig) => (
                <div key={sig.name} className="font-mono text-gray-500 bg-white rounded p-2 border border-gray-100 text-xs">
                  <span className="font-semibold text-gray-700">{sig.name}:</span>{' '}
                  {JSON.stringify(sig.raw, null, 0)}
                </div>
              ))}
            </div>
          </details>

          <a
            href={result.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            View on {result.platform === 'amazon' ? 'Amazon' : 'eBay'} ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ stats, elapsed }: { stats: JobStats | null; elapsed: number }) {
  const s = stats;
  const budgetPct = s ? Math.round((s.budgetUsed / s.budgetTotal) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">Elapsed</span>
        <span className="font-mono font-semibold text-gray-800">{fmt(s?.elapsedMs ?? elapsed)}</span>
      </div>
      <div className="w-px h-4 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="text-yellow-700 font-medium">Amazon</span>
        <span className="font-mono text-gray-700">{s?.requestCount.amazon ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-blue-700 font-medium">eBay</span>
        <span className="font-mono text-gray-700">{s?.requestCount.ebay ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">Image</span>
        <span className="font-mono text-gray-700">{s?.requestCount.image ?? 0}</span>
      </div>
      <div className="w-px h-4 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">Budget</span>
        <span className="font-mono text-gray-700">{s?.budgetUsed ?? 0}/{s?.budgetTotal ?? 120}</span>
        <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${budgetPct > 80 ? 'bg-red-400' : 'bg-indigo-400'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </div>
      <div className="w-px h-4 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">Queries</span>
        <span className="font-mono text-gray-700">{s?.queriesCompleted ?? 0}/{s?.queriesTotal ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">Results</span>
        <span className="font-mono font-semibold text-gray-800">{s?.resultCount ?? 0}</span>
      </div>
      {(s?.deduped ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-gray-400">
          <span>{s!.deduped} deduped</span>
        </div>
      )}
    </div>
  );
}

// ── Log console ────────────────────────────────────────────────────────────────

function LogConsole({ logs }: { logs: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={ref}
      className="h-24 overflow-y-auto bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-lg space-y-0.5"
    >
      {logs.length === 0 ? (
        <span className="text-gray-600">Scan output will appear here…</span>
      ) : (
        logs.map((l, i) => (
          <div key={i} className="leading-tight">
            <span className="text-gray-600">›</span> {l}
          </div>
        ))
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<ScoredListing[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [localElapsed, setLocalElapsed] = useState(0);

  // Filter + sort state
  const [minScore, setMinScore] = useState(0.2);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'amazon' | 'ebay'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time'>('score');

  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopScan = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsScanning(false);
  }, []);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setIsDone(false);
    setResults([]);
    setStats(null);
    setLogs([]);
    setLocalElapsed(0);
    startTimeRef.current = Date.now();

    // Local timer for smooth elapsed display
    timerRef.current = setInterval(() => {
      setLocalElapsed(Date.now() - startTimeRef.current);
    }, 500);

    const es = new EventSource('/api/scan');
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as ScanEvent;
        switch (event.type) {
          case 'result':
            setResults((prev) => {
              const next = [...prev, event.data];
              return next.sort((a, b) => b.finalScore - a.finalScore);
            });
            break;
          case 'stats':
            setStats(event.data);
            break;
          case 'log':
            setLogs((prev) => [...prev.slice(-200), event.message]);
            break;
          case 'done':
            setStats(event.finalStats);
            setIsDone(true);
            setIsScanning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            es.close();
            esRef.current = null;
            break;
          case 'error':
            setLogs((prev) => [...prev, `ERROR: ${event.message}`]);
            stopScan();
            break;
        }
      } catch {
        // malformed event
      }
    };

    es.onerror = () => {
      setLogs((prev) => [...prev, 'Connection error or scan ended']);
      stopScan();
    };
  }, [stopScan]);

  // Apply filters and sort
  const visible = results
    .filter((r) => {
      if (r.finalScore < minScore) return false;
      if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === 'score'
        ? b.finalScore - a.finalScore
        : b.scoredAt - a.scoredAt
    );

  const highRisk = results.filter((r) => r.finalScore >= 0.8).length;
  const medRisk = results.filter((r) => r.finalScore >= 0.6 && r.finalScore < 0.8).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Bustem <span className="text-gray-400 font-normal">×</span> Comfrt Infringement Detector
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated brand-protection pipeline · Amazon + eBay · 5 scoring signals
            </p>
          </div>
          <div className="flex items-center gap-3">
            {results.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {highRisk > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    {highRisk} high risk
                  </span>
                )}
                {medRisk > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {medRisk} med-high
                  </span>
                )}
              </div>
            )}
            <button
              onClick={isScanning ? stopScan : startScan}
              disabled={false}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isScanning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Stop Scan
                </span>
              ) : isDone ? (
                'Run Again'
              ) : (
                'Start Scan'
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <StatsBar stats={stats} elapsed={localElapsed} />

        {/* Log console (visible while scanning) */}
        {(isScanning || logs.length > 0) && <LogConsole logs={logs} />}

        {/* Filters */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Min Score</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="w-28 accent-indigo-600"
              />
              <span className="text-xs font-mono text-gray-700 w-8">{(minScore * 100).toFixed(0)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Platform</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as 'all' | 'amazon' | 'ebay')}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
              >
                <option value="all">All</option>
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'time')}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
              >
                <option value="score">By Score</option>
                <option value="time">By Time Found</option>
              </select>
            </div>

            <span className="text-xs text-gray-400 ml-auto">
              Showing {visible.length} of {results.length} results
            </span>
          </div>
        )}

        {/* Results */}
        {visible.length > 0 ? (
          <div className="space-y-2">
            {visible.map((r, i) => (
              <ResultRow key={r.id} result={r} rank={i + 1} />
            ))}
          </div>
        ) : isDone && results.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No results met the infringement threshold.
          </div>
        ) : !isScanning && results.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-3xl">🔍</p>
            <p className="text-gray-500 text-sm">
              Click <strong>Start Scan</strong> to search Amazon & eBay for potential Comfrt infringements.
            </p>
            <div className="inline-block text-left text-xs text-gray-400 bg-white border border-gray-200 rounded-lg p-4 space-y-1 max-w-sm">
              <p className="font-medium text-gray-600 mb-2">Pipeline overview</p>
              <p>· Runs {6} Amazon + {5} eBay queries × 2 pages each</p>
              <p>· Deduplicates by ASIN / eBay item ID</p>
              <p>· Scores on 5 signals: keywords, brand, image hash, price, seller</p>
              <p>· Streams results as they arrive</p>
              <p>· Soft budget: 150 total requests</p>
            </div>
          </div>
        ) : isScanning && results.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Building reference set and running queries…</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
