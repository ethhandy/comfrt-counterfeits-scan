export function ResultsHeader() {
  return (
    <div className="hidden sm:flex items-center gap-3 px-5 py-2 border-b border-stone-200 bg-[#f5f5f4] text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider sticky top-[60px] z-10">
      <div className="w-14 shrink-0">Score</div>
      <div className="w-8 shrink-0" />
      <div className="flex-1 min-w-0">Listing</div>
      <div className="w-20 shrink-0">Market</div>
      <div className="w-20 shrink-0 text-right">Price</div>
      <div className="w-28 shrink-0">Signals</div>
      <div className="w-44 shrink-0">LLM verdict</div>
      <div className="w-4 shrink-0" />
    </div>
  );
}
