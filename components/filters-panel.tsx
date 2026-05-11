'use client';

import { useState } from 'react';
import type { Platform } from '@/lib/types';
import { PLATFORM_OPTIONS } from '@/const/ui';

interface Props {
  minScore: number;
  onMinScoreChange: (v: number) => void;
  platformFilter: 'all' | Platform;
  onPlatformFilterChange: (v: 'all' | Platform) => void;
  sortBy: 'score' | 'time';
  onSortByChange: (v: 'score' | 'time') => void;
  priceMin: number | null;
  priceMax: number | null;
  onPriceMinChange: (v: number | null) => void;
  onPriceMaxChange: (v: number | null) => void;
  visibleCount: number;
  totalCount: number;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium text-stone-700"
      >
        {title}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-stone-400 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        >
          <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function OptionBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
        active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}

export function FiltersPanel({
  minScore,
  onMinScoreChange,
  platformFilter,
  onPlatformFilterChange,
  sortBy,
  onSortByChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  visibleCount,
  totalCount,
}: Props) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-stone-400">
            <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-stone-700">Filters</span>
        </div>
        <span className="text-xs text-stone-400 tabular-nums">{visibleCount} / {totalCount}</span>
      </div>

      <Section title="Sort by">
        <div className="space-y-0.5">
          <OptionBtn active={sortBy === 'score'} onClick={() => onSortByChange('score')}>By score</OptionBtn>
          <OptionBtn active={sortBy === 'time'} onClick={() => onSortByChange('time')}>Most recent</OptionBtn>
        </div>
      </Section>

      <Section title="Min score">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={minScore}
          onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
          className="w-full accent-stone-900 cursor-pointer mt-1"
        />
        <div className="flex justify-between text-xs text-stone-400 mt-1.5">
          <span>0%</span>
          <span className="font-semibold text-stone-700">{(minScore * 100).toFixed(0)}%</span>
          <span>100%</span>
        </div>
      </Section>

      <Section title="Marketplace">
        <div className="space-y-0.5">
          {PLATFORM_OPTIONS.map((opt) => (
            <OptionBtn
              key={opt.value}
              active={platformFilter === opt.value}
              onClick={() => onPlatformFilterChange(opt.value)}
            >
              {opt.label}
            </OptionBtn>
          ))}
        </div>
      </Section>

      <Section title="Price" defaultOpen={false}>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            min={0}
            placeholder="Min $"
            value={priceMin ?? ''}
            onChange={(e) => onPriceMinChange(e.target.value !== '' ? Number(e.target.value) : null)}
            className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent"
          />
          <input
            type="number"
            min={0}
            placeholder="Max $"
            value={priceMax ?? ''}
            onChange={(e) => onPriceMaxChange(e.target.value !== '' ? Number(e.target.value) : null)}
            className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent"
          />
        </div>
      </Section>
    </div>
  );
}
