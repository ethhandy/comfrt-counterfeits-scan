/**
 * Builds a reference set of authentic Comfrt product image hashes.
 * Uses Comfrt's Shopify products JSON API to get fresh product images.
 * Falls back to hardcoded CDN URLs if the API is unavailable.
 */

import { computeDHashFromUrl } from './dhash';

// Hardcoded fallback — known Comfrt hoodie product images from their Shopify store
const FALLBACK_REFERENCE_URLS = [
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/2_cfe34730-e137-4b60-80dd-b3f43ea2f8c1.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/10_3ad2a8d5-9890-4ce5-8a9b-2e4f6b25c13d.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/Untitleddesign_16fc6b44-d22a-4c35-9c56-02a4bf09e01a.png',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/1_2e82fd23-8ed8-49ec-aa02-83e73d21cfc9.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/1_3d2c377d-37fd-4d25-ae12-0fe2ec48b95e.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/unfurl_image.jpg',
];

interface ShopifyProduct {
  id: number;
  title: string;
  images: Array<{ src: string }>;
}

/** Fetch product images from Comfrt's Shopify JSON API. */
async function fetchComfrtProductImages(): Promise<string[]> {
  const allUrls: string[] = [];

  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://comfrt.com/products.json?limit=20&page=${page}`,
        {
          signal: AbortSignal.timeout(12000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BustemBot/1.0)' },
        }
      );
      if (!res.ok) break;

      const data = await res.json();
      const products: ShopifyProduct[] = data.products ?? [];
      if (products.length === 0) break;

      for (const p of products) {
        // Prefer hoodie/sweatshirt products — they're the main infringement target
        const isHoodie =
          /hoodie|sweatshirt|pullover|blanket/i.test(p.title) &&
          !/robe|shorts|tank|brief|boxer|tee|legging/i.test(p.title);

        if (isHoodie && p.images.length > 0) {
          allUrls.push(p.images[0].src);
        }
        if (allUrls.length >= 8) break;
      }
      if (allUrls.length >= 8) break;
    }

    // If we didn't find 4+ hoodies, add general product images too
    if (allUrls.length < 4) {
      const res = await fetch('https://comfrt.com/products.json?limit=20', {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BustemBot/1.0)' },
      });
      if (res.ok) {
        const data = await res.json();
        const products: ShopifyProduct[] = data.products ?? [];
        for (const p of products) {
          if (p.images.length > 0 && allUrls.length < 8) {
            const url = p.images[0].src;
            if (!allUrls.includes(url)) allUrls.push(url);
          }
        }
      }
    }
  } catch {
    // network error — fall through to fallbacks
  }

  return allUrls;
}

export const AUTHENTIC_PRODUCT_NAMES = [
  'Comfrt Hoodie',
  'Comfrt Oversized Hoodie',
  'Comfrt Minimalist Hoodie',
  'Comfrt Blanket Hoodie',
  'Comfrt Sweatshirt',
  'Comfrt Wearable Blanket',
];

export const AUTHENTIC_PRICE_RANGE = { min: 59, max: 169 };

export interface ReferenceSet {
  urls: string[];
  hashes: string[];
  successCount: number;
  requestsUsed: number;
}

/** Download reference images and compute dHashes. */
export async function buildReferenceSet(
  onLog: (msg: string) => void
): Promise<ReferenceSet> {
  onLog('Fetching authentic Comfrt product images for reference…');

  let requestsUsed = 0;
  const urls = await fetchComfrtProductImages();
  requestsUsed += 3; // 3 page fetches attempted

  const finalUrls = urls.length >= 4 ? urls : FALLBACK_REFERENCE_URLS;
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
    if (r.status === 'fulfilled' && r.value.hash) {
      hashes.push(r.value.hash);
    }
  }

  onLog(`Reference set ready: ${hashes.length}/${finalUrls.length} images hashed`);
  return { urls: finalUrls, hashes, successCount: hashes.length, requestsUsed };
}
