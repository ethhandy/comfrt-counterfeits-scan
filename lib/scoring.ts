import type { RawListing, ScoredListing } from './types';
import {
  computeTitleKeywordSignal,
  computeBrandSignal,
  computePriceSignal,
  computeImageHashSignal,
  computeSellerSignal,
} from './signals';

export async function scoreListing(
  listing: RawListing,
  referenceHashes: string[]
): Promise<ScoredListing> {
  const [titleSig, brandSig, priceSig, imageSig, sellerSig] =
    await Promise.all([
      computeTitleKeywordSignal(listing.title),
      computeBrandSignal(listing.title, listing.brand),
      computePriceSignal(listing.price),
      computeImageHashSignal(listing.imageUrl, referenceHashes),
      computeSellerSignal(listing.seller, listing.rating, listing.reviewCount),
    ]);

  const signals = [titleSig, brandSig, priceSig, imageSig, sellerSig];

  // Weighted sum. Weights already sum to 1.0, so this is the final probability.
  const finalScore = Math.min(
    1,
    Math.max(0, signals.reduce((acc, s) => acc + s.contribution, 0))
  );

  const topReasons = [...signals]
    .sort((a, b) => b.contribution - a.contribution)
    .filter((s) => s.score > 0.3)
    .slice(0, 3)
    .map((s) => s.reasoning);

  return {
    ...listing,
    signals,
    finalScore,
    topReasons,
    scoredAt: Date.now(),
  };
}
