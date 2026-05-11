'use client';

import { useState } from 'react';
import { useScanJob } from '@/hooks/useScanJob';
import { ScanHeader } from '@/components/scan-header';
import { FilterBar } from '@/components/filter-bar';
import { ResultsHeader } from '@/components/results-header';
import { ResultRow } from '@/components/result-row';
import { EmptyState } from '@/components/empty-state';
import { PipelineFooter } from '@/components/pipeline-footer';
import type { Platform } from '@/lib/types';

export default function Home() {
  const { isScanning, isDone, results, stats, localElapsed, startScan, stopScan } = useScanJob();

  const [minScore, setMinScore]             = useState(0.2);
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [sortBy, setSortBy]                 = useState<'score' | 'time'>('score');

  const visible = results
    .filter((r) => r.finalScore >= minScore)
    .filter((r) => platformFilter === 'all' || r.platform === platformFilter)
    .sort((a, b) => sortBy === 'score' ? b.finalScore - a.finalScore : b.scoredAt - a.scoredAt);

  const hasStarted = isScanning || isDone || results.length > 0;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <ScanHeader
        isScanning={isScanning}
        isDone={isDone}
        stats={stats}
        localElapsed={localElapsed}
        resultCount={results.length}
        onStart={startScan}
        onStop={stopScan}
      />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full bg-white border-x border-stone-200">

        {hasStarted && (
          <FilterBar
            visibleCount={visible.length}
            totalCount={results.length}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          {visible.length > 0 ? (
            <>
              <ResultsHeader />
              <div className="divide-y divide-stone-100">
                {visible.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </div>
            </>
          ) : results.length > 0 && visible.length === 0 ? (
            <div className="py-24 text-center space-y-1">
              <p className="text-sm font-semibold text-stone-700">No results match current filters</p>
              <p className="text-sm text-stone-400">Try lowering the minimum score or widening the marketplace.</p>
            </div>
          ) : isDone && results.length === 0 ? (
            <div className="py-24 text-center space-y-1">
              <p className="text-sm font-semibold text-stone-700">Scan complete</p>
              <p className="text-sm text-stone-400">No listings met the infringement threshold.</p>
            </div>
          ) : isScanning && results.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-3 m-auto">
              <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-stone-400">Searching Amazon &amp; eBay&hellip;</p>
            </div>
          ) : (
            <EmptyState onStart={startScan} />
          )}
        </main>

      </div>

      <PipelineFooter />
    </div>
  );
}
