import type { RawListing, Platform } from './types';
import {
  SCRAPER_API_BASE,
  SCRAPER_TIMEOUT_MS,
  SCRAPER_RAW_TIMEOUT_MS,
  MAX_EBAY_RAW_LISTINGS,
} from '@/const/scraper';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY ?? '';

interface AmazonProduct {
  asin?: string;
  name?: string;
  title?: string;
  url?: string;
  image?: string;
  price?: number;
  price_string?: string;
  stars?: number;
  rating?: number;
  total_reviews?: number;
  ratings_total?: number;
  brand?: string;
}

export async function searchAmazon(
  query: string,
  page: number
): Promise<{ listings: RawListing[]; requestsUsed: number }> {
  const url = new URL(`${SCRAPER_API_BASE}/structured/amazon/search/v1`);
  url.searchParams.set('api_key', SCRAPER_API_KEY);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('tld', 'com');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS) });
    if (!res.ok) return { listings: [], requestsUsed: 1 };

    const data = await res.json();
    const raw: AmazonProduct[] = Array.isArray(data) ? data : data.results ?? [];

    const listings: RawListing[] = raw
      .filter((r) => r.asin && (r.name ?? r.title ?? '').length > 0)
      .map((r) => {
        const title = r.name ?? r.title ?? '';
        const price =
          typeof r.price === 'number' ? r.price
          : r.price_string ? parseFloat(r.price_string.replace(/[^0-9.]/g, '')) || null
          : null;
        return {
          id: `amazon_${r.asin}`,
          platform: 'amazon' as Platform,
          title,
          price: price && !isNaN(price) ? price : null,
          imageUrl: r.image ?? null,
          productUrl: r.url ?? `https://www.amazon.com/dp/${r.asin}`,
          brand: r.brand ?? null,
          seller: null,
          rating: r.stars ?? r.rating ?? null,
          reviewCount: r.total_reviews ?? r.ratings_total ?? null,
        };
      });

    return { listings, requestsUsed: 1 };
  } catch {
    return { listings: [], requestsUsed: 1 };
  }
}

interface EbayItem {
  product_title?: string;
  title?: string;
  image?: string;
  product_url?: string;
  url?: string;
  item_price?: { value?: number; currency?: string };
  price?: string | number;
  seller?: { username?: string; feedback_score?: number; feedback_percentage?: number };
}

function extractEbayItemId(url: string): string | null {
  const m = url.match(/\/itm\/(\d+)/);
  return m ? m[1] : null;
}

function parseEbayPrice(item: EbayItem): number | null {
  if (item.item_price?.value != null) return item.item_price.value;
  if (typeof item.price === 'number') return item.price;
  if (typeof item.price === 'string') {
    const n = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

export async function searchEbay(
  query: string,
  page: number
): Promise<{ listings: RawListing[]; requestsUsed: number }> {
  const url = new URL(`${SCRAPER_API_BASE}/structured/ebay/search`);
  url.searchParams.set('api_key', SCRAPER_API_KEY);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS) });

    if (res.ok) {
      const data = await res.json();
      const items: EbayItem[] = Array.isArray(data)
        ? data
        : data.results ?? data.items ?? data.search_results ?? data.data ?? [];

      if (items.length > 0) {
        const listings: RawListing[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const title = item.product_title ?? item.title ?? '';
          const productUrl = item.product_url ?? item.url ?? '';
          if (!title || !productUrl) continue;

          const itemId = extractEbayItemId(productUrl);
          if (!itemId || seen.has(itemId)) continue;
          seen.add(itemId);

          const feedbackPct =
            item.seller?.feedback_percentage ??
            (item.seller?.feedback_score != null && item.seller.feedback_score <= 100
              ? item.seller.feedback_score
              : null);

          listings.push({
            id: `ebay_${itemId}`,
            platform: 'ebay' as Platform,
            title,
            price: parseEbayPrice(item),
            imageUrl: item.image ?? null,
            productUrl,
            brand: null,
            seller: item.seller?.username ?? null,
            rating: feedbackPct,
            reviewCount: null,
          });
        }

        return { listings, requestsUsed: 1 };
      }
    }
  } catch { /* ignored */ }

  return searchEbayRaw(query, page);
}

async function searchEbayRaw(
  query: string,
  page: number
): Promise<{ listings: RawListing[]; requestsUsed: number }> {
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_pgn=${page}`;
  const scraperUrl = `${SCRAPER_API_BASE}/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(ebayUrl)}`;

  try {
    const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(SCRAPER_RAW_TIMEOUT_MS) });
    if (!res.ok) return { listings: [], requestsUsed: 1 };
    const html = await res.text();
    return { listings: parseEbayHtml(html), requestsUsed: 1 };
  } catch {
    return { listings: [], requestsUsed: 1 };
  }
}

function parseEbayHtml(html: string): RawListing[] {
  const listings: RawListing[] = [];
  const seenIds = new Set<string>();

  for (const match of html.matchAll(/\/itm\/(\d{10,})/g)) {
    const itemId = match[1];
    if (seenIds.has(itemId)) continue;
    seenIds.add(itemId);

    const start = Math.max(0, match.index! - 1200);
    const end   = Math.min(html.length, match.index! + 2000);
    const ctx   = html.slice(start, end);

    const titleBlock = ctx.match(/s-item__title[^>]*>(.*?)<\/h3>/s);
    const title = titleBlock
      ? titleBlock[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&')
      : null;
    if (!title || title.length < 5 || title.toLowerCase() === 'shop on ebay') continue;

    const priceM = ctx.match(/s-item__price[^>]*>([^<]+)</);
    const imgM   = ctx.match(/src="(https:\/\/i\.ebayimg\.com\/[^"?]+)"/);

    const rawPrice = priceM?.[1]?.replace(/[^0-9.]/g, '') ?? '';
    const price = rawPrice ? parseFloat(rawPrice) : null;

    listings.push({
      id: `ebay_${itemId}`,
      platform: 'ebay' as Platform,
      title,
      price: price && !isNaN(price) ? price : null,
      imageUrl: imgM?.[1] ?? null,
      productUrl: `https://www.ebay.com/itm/${itemId}`,
      brand: null,
      seller: null,
      rating: null,
      reviewCount: null,
    });

    if (listings.length >= MAX_EBAY_RAW_LISTINGS) break;
  }

  return listings;
}
