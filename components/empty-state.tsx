interface Props {
  onStart: () => void;
}

export function EmptyState({ onStart }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
      <div className="max-w-[480px] w-full text-center flex flex-col items-center gap-[18px]">

        {/* Search mark */}
        <div className="w-20 h-20 rounded-full bg-white border border-stone-200 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-stone-400">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.75" />
            <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>

        {/* Heading + description */}
        <div className="space-y-2">
          <h1 className="text-[22px] font-semibold text-stone-900 tracking-tight leading-snug m-0">
            Ready to scan for Comfrt counterfeits
          </h1>
          <p className="text-[13.5px] text-stone-500 leading-[1.55] m-0">
            We&rsquo;ll query Amazon and eBay, then score each listing 0–1 on
            how likely it is to be infringing. Results stream in as they&rsquo;re scored.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-[22px] py-3 bg-stone-900 text-[#fafaf9] text-sm font-semibold rounded-lg cursor-pointer tracking-tight hover:bg-stone-800 transition-colors"
        >
          <span>▶</span> Run scan
        </button>

        {/* Footnote */}
        <span className="text-[11.5px] text-stone-400 font-mono">
          Runs for up to ~5 minutes · stop anytime
        </span>

      </div>
    </div>
  );
}
