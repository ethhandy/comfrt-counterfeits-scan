'use client';

import { useState } from 'react';
import type { ScoredListing, SignalResult } from '@/lib/types';
import { PlatformBadge } from './platform-badge';

type Bucket = 'high' | 'medium' | 'low' | 'minimal';

function scoreBucket(score: number): Bucket {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'low';
  return 'minimal';
}

const BUCKET_STYLE: Record<Bucket, { pill: string; dot: string }> = {
  high:    { pill: 'bg-[#fee2e4] text-[#9f1239]', dot: 'bg-[#e11d48]' },
  medium:  { pill: 'bg-[#fef3c7] text-[#92400e]', dot: 'bg-[#d97706]' },
  low:     { pill: 'bg-[#dbeafe] text-[#1e40af]', dot: 'bg-[#2563eb]' },
  minimal: { pill: 'bg-stone-200 text-stone-500',  dot: 'bg-stone-400' },
};

function ScorePill({ score }: { score: number }) {
  const { pill, dot } = BUCKET_STYLE[scoreBucket(score)];
  return (
    <span className={`inline-flex items-center gap-1.5 ${pill} px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {Math.round(score * 100)}%
    </span>
  );
}

function sparkColor(v: number) {
  if (v >= 0.75) return 'bg-[#e11d48]';
  if (v >= 0.5)  return 'bg-[#d97706]';
  if (v >= 0.25) return 'bg-[#2563eb]';
  return 'bg-stone-300';
}

function SparkBars({ signals }: { signals: SignalResult[] }) {
  return (
    <div className="flex gap-1 items-end shrink-0" style={{ height: 22 }}>
      {signals.map((sig) => (
        <div
          key={sig.name}
          title={`${sig.label}: ${sig.score.toFixed(2)}`}
          className={`w-2.5 rounded-sm shrink-0 ${sparkColor(sig.score)}`}
          style={{ height: `${Math.max(sig.score * 22, 2)}px` }}
        />
      ))}
    </div>
  );
}

const REASON_STYLE: Record<string, { bg: string; text: string }> = {
  brand:  { bg: 'bg-[#fce7f3]', text: 'text-[#9d174d]' },
  image:  { bg: 'bg-[#e0e7ff]', text: 'text-[#3730a3]' },
  price:  { bg: 'bg-[#fef3c7]', text: 'text-[#78350f]' },
  text:   { bg: 'bg-[#dcfce7]', text: 'text-[#14532d]' },
  seller: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]' },
};

function inferReasonTag(sigName: string): string {
  if (sigName.startsWith('brand') || sigName.toLowerCase().includes('brand') || sigName.toLowerCase().includes('title'))
    return 'brand';
  if (sigName.startsWith('price') || sigName.toLowerCase().includes('price'))
    return 'price';
  if (sigName.startsWith('image') || sigName.toLowerCase().includes('image'))
    return 'image';
  return 'text';
}

function inferTextReasonTag(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('image') || r.includes('visual') || r.includes('similarity') || r.includes('phash') || r.includes('clip'))
    return 'image';
  if (r.includes('price') || r.includes('msrp') || r.includes('retail') || r.includes('$'))
    return 'price';
  if (r.includes('seller') || r.includes('feedback') || r.includes('rating') || r.includes('review'))
    return 'seller';
  if (r.includes('brand') || r.includes('comfrt') || r.includes('title') || r.includes('keyword'))
    return 'brand';
  return 'text';
}

function ReasonTag({ tag }: { tag: string }) {
  const s = REASON_STYLE[tag] ?? REASON_STYLE.text;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
      {tag}
    </span>
  );
}

function SignalBarRow({ signal }: { signal: SignalResult }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{signal.label}</span>
        <span className="text-[11px] font-mono font-medium text-stone-700">{signal.score.toFixed(2)}</span>
      </div>
      <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${sparkColor(signal.score)}`}
          style={{ width: `${signal.score * 100}%` }}
        />
      </div>
    </div>
  );
}

function ExpandedDrawer({ result }: { result: ScoredListing }) {
  const topSignal = [...result.signals]
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score)[0];

  return (
    <div
      className="px-4 sm:px-5 pt-4 pb-5 bg-stone-50 border-t border-stone-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        <div className="space-y-3">
          <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider">Listing details</p>
          <div className="flex gap-3">
            {result.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.imageUrl}
                alt=""
                className="w-20 h-20 shrink-0 rounded-md object-cover border border-stone-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-20 shrink-0 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className="text-stone-300">
                  <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1 9.5l3-3 2.5 2.5 2.5-3.5L13 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-mono text-stone-400 break-all leading-snug">{result.id}</p>
              {result.seller && (
                <p className="text-xs text-stone-500">
                  <span className="text-stone-400">Seller:</span> {result.seller}
                </p>
              )}
              {result.brand && (
                <p className="text-xs text-stone-500">
                  <span className="text-stone-400">Brand:</span> {result.brand}
                </p>
              )}
              {result.price != null && (
                <p className="text-sm font-semibold font-mono text-stone-900 mt-1">
                  ${result.price.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider">Signal breakdown</p>
          <div className="space-y-3">
            {result.signals.map((sig) => (
              <SignalBarRow key={sig.name} signal={sig} />
            ))}
          </div>
          <div className="p-2.5 bg-white border border-stone-200 rounded-md mt-2">
            <p className="text-[10.5px] font-semibold text-stone-400 mb-1">Weighted score</p>
            <p className="font-mono text-xs text-stone-600">
              final = <span className="font-bold text-stone-900">{result.finalScore.toFixed(2)}</span>
              {topSignal && (
                <span className="text-stone-400 ml-2">
                  (top: {topSignal.label} {topSignal.score.toFixed(2)})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider">Contributing reasons</p>
          <div className="space-y-2">
            {result.topReasons.length > 0 ? result.topReasons.map((reason, i) => {
              const tag = inferTextReasonTag(reason);
              const s = REASON_STYLE[tag] ?? REASON_STYLE.text;
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-white border border-stone-200 text-xs">
                  <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
                    {tag}
                  </span>
                  <span className="text-stone-600 leading-relaxed">{reason}</span>
                </div>
              );
            }) : (
              <p className="text-xs text-stone-400">No flags raised.</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <a
              href={result.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 border border-stone-300 bg-white rounded px-2.5 py-1.5 hover:bg-stone-50 transition-colors"
            >
              Open listing
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 8L8 2M4 2h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

interface Props {
  result: ScoredListing;
}

export function ResultRow({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  const topSignal = [...result.signals]
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score)[0];

  const topTag = topSignal ? inferReasonTag(topSignal.name) : null;

  return (
    <div>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-stone-50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-14 shrink-0 flex items-center">
          <ScorePill score={result.finalScore} />
        </div>

        <div className="w-8 h-8 shrink-0 rounded overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
          {result.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-stone-300">
              <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 9.5l3-3 2.5 2.5 2.5-3.5L13 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate leading-snug">{result.title}</p>
          <p className="text-[11px] font-mono text-stone-400 mt-0.5 truncate">
            {result.id}{result.seller ? ` · ${result.seller}` : ''}
          </p>
          <div className="flex sm:hidden items-center gap-2 mt-1">
            <PlatformBadge platform={result.platform} />
            {result.price != null && (
              <span className="text-xs font-mono text-stone-500">${result.price.toFixed(2)}</span>
            )}
          </div>
        </div>

        <div className="hidden sm:block w-20 shrink-0">
          <PlatformBadge platform={result.platform} />
        </div>

        <div className="hidden sm:block w-20 shrink-0 text-right tabular-nums">
          {result.price != null
            ? <span className="text-sm font-mono font-semibold text-stone-800">${result.price.toFixed(2)}</span>
            : <span className="text-stone-200">—</span>}
        </div>

        <div className="hidden sm:flex w-28 shrink-0 items-end">
          <SparkBars signals={result.signals} />
        </div>

        <div className="hidden sm:flex w-16 shrink-0 items-center">
          {topTag && <ReasonTag tag={topTag} />}
        </div>

        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-stone-300 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {expanded && <ExpandedDrawer result={result} />}
    </div>
  );
}
