import { computeDHashFromUrl } from './dhash';
import {
  COMFRT_SHOPIFY_API,
  REFERENCE_TIMEOUT_MS,
  REFERENCE_TARGET_COUNT,
  REFERENCE_MIN_COUNT,
  REFERENCE_MAX_PAGES,
  REFERENCE_USER_AGENT,
  HOODIE_INCLUDE,
  HOODIE_EXCLUDE,
  FALLBACK_REFERENCE_URLS,
} from '@/const/scraper';

interface ShopifyProduct {
  id: number;
  title: string;
  images: Array<{ src: string }>;
}

async function fetchComfrtProductImages(): Promise<string[]> {
  const urls: string[] = [];

  try {
    for (let page = 1; page <= REFERENCE_MAX_PAGES; page++) {
      const res = await fetch(`${COMFRT_SHOPIFY_API}?limit=20&page=${page}`, {
        signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
        headers: { 'User-Agent': REFERENCE_USER_AGENT },
      });
      if (!res.ok) break;

      const data = await res.json();
      const products: ShopifyProduct[] = data.products ?? [];
      if (products.length === 0) break;

      for (const p of products) {
        const isHoodie = HOODIE_INCLUDE.test(p.title) && !HOODIE_EXCLUDE.test(p.title);
        if (isHoodie && p.images.length > 0) urls.push(p.images[0].src);
        if (urls.length >= REFERENCE_TARGET_COUNT) break;
      }
      if (urls.length >= REFERENCE_TARGET_COUNT) break;
    }

    if (urls.length < REFERENCE_MIN_COUNT) {
      const res = await fetch(`${COMFRT_SHOPIFY_API}?limit=20`, {
        signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
        headers: { 'User-Agent': REFERENCE_USER_AGENT },
      });
      if (res.ok) {
        const data = await res.json();
        const products: ShopifyProduct[] = data.products ?? [];
        for (const p of products) {
          if (p.images.length > 0 && urls.length < REFERENCE_TARGET_COUNT) {
            const url = p.images[0].src;
            if (!urls.includes(url)) urls.push(url);
          }
        }
      }
    }
  } catch { /* ignored */ }

  return urls;
}

export interface ReferenceSet {
  urls: string[];
  hashes: string[];
  successCount: number;
  requestsUsed: number;
}

export async function buildReferenceSet(onLog: (msg: string) => void): Promise<ReferenceSet> {
  onLog('Fetching authentic Comfrt product images for reference…');

  let requestsUsed = 0;
  const urls = await fetchComfrtProductImages();
  requestsUsed += REFERENCE_MAX_PAGES;

  const finalUrls = urls.length >= REFERENCE_MIN_COUNT ? urls : [...FALLBACK_REFERENCE_URLS];
  onLog(`Found ${finalUrls.length} reference image URLs`);

  const results = await Promise.allSettled(
    finalUrls.map(async (url) => {
      requestsUsed++;
      const hash = await computeDHashFromUrl(url);
      return { url, hash };
    })
  );

  const hashes: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.hash) hashes.push(r.value.hash);
  }

  onLog(`Reference set ready: ${hashes.length}/${finalUrls.length} images hashed`);
  return { urls: finalUrls, hashes, successCount: hashes.length, requestsUsed };
}
