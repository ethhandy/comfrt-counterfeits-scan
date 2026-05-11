import type { RawListing, ScoredListing } from './types';
import {
  computeTitleKeywordSignal,
  computeBrandSignal,
  computePriceSignal,
  computeImageHashSignal,
  computeSellerSignal,
  computeLlmSignal,
} from './signals';
import { SIGNAL_WEIGHTS } from '@/const/signals';

// Only call Gemini when cheaper signals already suggest something worth investigating.
// Below this threshold the listing is almost certainly clean — LLM adds no value.
const LLM_PRESCREEN_THRESHOLD = 0.20;

export async function scoreListing(
  listing: RawListing,
  referenceHashes: string[]
): Promise<ScoredListing> {
  const [titleSig, brandSig, priceSig, imageSig, sellerSig] = await Promise.all([
    computeTitleKeywordSignal(listing.title),
    computeBrandSignal(listing.title, listing.brand),
    computePriceSignal(listing.price),
    computeImageHashSignal(listing.imageUrl, referenceHashes),
    computeSellerSignal(listing.seller, listing.rating, listing.reviewCount),
  ]);

  const cheapScore =
    titleSig.contribution +
    brandSig.contribution +
    priceSig.contribution +
    imageSig.contribution +
    sellerSig.contribution;

  // LLM weight re-allocated to cheap signals when skipped, so the final score
  // stays on the same [0, 1] scale. We scale up by 1/(1 - llmWeight).
  const llmWeight = SIGNAL_WEIGHTS.llmAnalysis;
  const llmSig = cheapScore >= LLM_PRESCREEN_THRESHOLD
    ? await computeLlmSignal(listing.title, listing.brand, listing.price)
    : {
        name: 'llm_analysis',
        label: 'LLM Analysis',
        score: 0,
        weight: llmWeight,
        contribution: 0,
        raw: { skipped: true, reason: 'pre-screen score too low' },
        reasoning: 'LLM signal unavailable',
      };

  const signals = [titleSig, brandSig, priceSig, imageSig, sellerSig, llmSig];

  const rawSum = signals.reduce((acc, s) => acc + s.contribution, 0);

  // If LLM was skipped, normalise so the score is still comparable to runs
  // where LLM fired. Without this, skipped listings score up to 0.75 max.
  const finalScore = Math.min(
    1,
    Math.max(
      0,
      llmSig.contribution === 0 && cheapScore < LLM_PRESCREEN_THRESHOLD
        ? rawSum / (1 - llmWeight)
        : rawSum
    )
  );

  const topReasons = [...signals]
    .filter((s) => s.name !== 'llm_analysis')
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
