import type { Platform } from '@/lib/types';

interface Props {
  platform: Platform;
}

export function PlatformBadge({ platform }: Props) {
  const isAmazon = platform === 'amazon';
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
        isAmazon
          ? 'bg-[#fef3c7] text-[#7c2d12]'
          : 'bg-[#dbeafe] text-[#1e3a8a]'
      }`}
    >
      {isAmazon ? 'Amazon' : 'eBay'}
    </span>
  );
}
