import { Fragment } from 'react';
import { PIPELINE_OVERVIEW } from '@/const/ui';

export function PipelineFooter() {
  return (
    <footer className="sticky bottom-0 bg-white border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-auto sm:h-9 py-2 sm:py-0 flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {PIPELINE_OVERVIEW.map(({ label, value }, i) => (
          <Fragment key={label}>
            {i > 0 && <span className="text-stone-200 mx-2">·</span>}
            <span className="text-xs text-stone-400">
              <span className="text-stone-500">{label}:</span>{' '}{value}
            </span>
          </Fragment>
        ))}
      </div>
    </footer>
  );
}
