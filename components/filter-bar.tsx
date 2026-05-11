'use client';

import type { Platform } from '@/lib/types';

interface Props {
  visibleCount: number;
  totalCount: number;
  platformFilter: 'all' | Platform;
  onPlatformFilterChange: (v: 'all' | Platform) => void;
  minScore: number;
  onMinScoreChange: (v: number) => void;
  sortBy: 'score' | 'time';
  onSortByChange: (v: 'score' | 'time') => void;
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  visibleCount, totalCount,
  platformFilter, onPlatformFilterChange,
  minScore, onMinScoreChange,
  sortBy, onSortByChange,
}: Props) {
  return (
    <div className="px-4 sm:px-5 bg-white border-b border-stone-200">

      {/* Main row — always visible */}
      <div className="flex items-center gap-2 sm:gap-3 py-2.5">

        <span className="text-xs font-medium text-stone-400 tabular-nums shrink-0">
          {visibleCount}<span className="text-stone-300">/{totalCount}</span>
        </span>

        <div className="flex items-center bg-stone-100 rounded-md p-0.5 shrink-0">
          <SegBtn active={platformFilter === 'all'}    onClick={() => onPlatformFilterChange('all')}>All</SegBtn>
          <SegBtn active={platformFilter === 'amazon'} onClick={() => onPlatformFilterChange('amazon')}>Amazon</SegBtn>
          <SegBtn active={platformFilter === 'ebay'}   onClick={() => onPlatformFilterChange('ebay')}>eBay</SegBtn>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-px h-5 bg-stone-200" />
          <span className="text-[11px] text-stone-400">Min score</span>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={minScore}
            onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
            className="w-20 accent-stone-900 cursor-pointer"
          />
          <span className="font-mono text-[11px] text-stone-700 min-w-[2.5rem] tabular-nums">
            {Math.round(minScore * 100)}%
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center bg-stone-100 rounded-md p-0.5 shrink-0">
          <SegBtn active={sortBy === 'score'} onClick={() => onSortByChange('score')}>
            <span className="sm:hidden">Score</span>
            <span className="hidden sm:inline">By score</span>
          </SegBtn>
          <SegBtn active={sortBy === 'time'} onClick={() => onSortByChange('time')}>
            <span className="sm:hidden">Recent</span>
            <span className="hidden sm:inline">Most recent</span>
          </SegBtn>
        </div>
      </div>

      <div className="sm:hidden flex items-center gap-2 pb-2.5">
        <span className="text-[11px] text-stone-400 shrink-0">Min score</span>
        <input
          type="range"
          min={0} max={1} step={0.05}
          value={minScore}
          onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
          className="flex-1 accent-stone-900 cursor-pointer"
        />
        <span className="font-mono text-[11px] text-stone-700 min-w-[2.5rem] tabular-nums">
          {Math.round(minScore * 100)}%
        </span>
      </div>

    </div>
  );
}
