export const SCRAPER_API_BASE = 'https://api.scraperapi.com';
export const SCRAPER_TIMEOUT_MS = 35_000;
export const SCRAPER_RAW_TIMEOUT_MS = 45_000;
export const MAX_EBAY_RAW_LISTINGS = 24;

export const COMFRT_SHOPIFY_API = 'https://comfrt.com/products.json';
export const REFERENCE_TIMEOUT_MS = 12_000;
export const REFERENCE_TARGET_COUNT = 8;
export const REFERENCE_MIN_COUNT = 4;
export const REFERENCE_MAX_PAGES = 3;
export const REFERENCE_USER_AGENT = 'Mozilla/5.0 (compatible; BustemBot/1.0)';

export const HOODIE_INCLUDE = /hoodie|sweatshirt|pullover|blanket/i;
export const HOODIE_EXCLUDE = /robe|shorts|tank|brief|boxer|tee|legging/i;

export const FALLBACK_REFERENCE_URLS = [
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/2_cfe34730-e137-4b60-80dd-b3f43ea2f8c1.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/10_3ad2a8d5-9890-4ce5-8a9b-2e4f6b25c13d.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/Untitleddesign_16fc6b44-d22a-4c35-9c56-02a4bf09e01a.png',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/1_2e82fd23-8ed8-49ec-aa02-83e73d21cfc9.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/1_3d2c377d-37fd-4d25-ae12-0fe2ec48b95e.jpg',
  'https://cdn.shopify.com/s/files/1/0569/4029/8284/files/unfurl_image.jpg',
] as const;
