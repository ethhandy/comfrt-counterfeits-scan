import { GoogleGenAI, Type } from '@google/genai';

const MODEL    = 'gemini-2.0-flash';
const TIMEOUT  = 12_000;
const FALLBACK = { score: 0.35, reasoning: 'LLM signal unavailable' };

export async function scoreTitleWithGemini(
  title: string,
  brand: string | null,
  price: number | null,
): Promise<{ score: number; reasoning: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return FALLBACK;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an IP analyst at a brand protection firm specializing in apparel counterfeits. Evaluate this marketplace listing for potential Comfrt brand infringement.

BRAND BACKGROUND
Comfrt (comfrt.com) is a US direct-to-consumer brand famous for its signature "wearable blanket hoodie" — an oversized fleece or sherpa pullover that doubles as a blanket. Authentic retail: $59–$169. Known for viral TikTok marketing. Core SKUs: hoodies, sweatshirts, joggers — always oversized/blanket-weight.

INFRINGEMENT PATTERNS TO DETECT
- Brand name variants: "Comfrt", "Cumfrt", "Confrt", "Com frt", "C0mfrt", "C*mfrt", "Comfrtt"
- Explicit knockoff signals: "dupe", "inspired by Comfrt", "Comfrt style", "like Comfrt", "Comfrt inspired"
- Price red flags: authentic Comfrt retails $59–$169; listings under $35 for the identical product type are strong counterfeit signals
- Product type match: "wearable blanket hoodie", "blanket sweatshirt", "hoodie blanket", "oversized blanket hoodie" — all Comfrt's category; higher risk when combined with low price

LEGITIMATE (score low)
- Generic "sherpa hoodie", "fleece blanket", "wearable blanket" with no Comfrt reference and reasonable pricing
- Clearly distinct brands (e.g. "Sienna", "OOSC") selling similar product types
- Listings priced at or above $59 from an established non-Comfrt brand

SCORING CALIBRATION
0.8-1.0  Comfrt name/variant present; explicit knockoff language; or price under $25 with exact product match
0.5-0.7  Comfrt-adjacent phrasing; correct product category at suspiciously low price ($25-$58); no brand but heavily Comfrt-descriptive
0.2-0.4  Correct product type (blanket hoodie) but no brand reference and plausible pricing
0.0-0.2  Generic adjacent product (standard hoodie, blanket) or clearly legitimate competing brand

Listing to evaluate:
Title: "${title}"
Brand field: ${brand ? `"${brand}"` : 'not specified'}
Price: ${price != null ? `$${price.toFixed(2)}` : 'not listed'}`;

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.NUMBER,
                description: 'Infringement probability 0.0-1.0',
              },
              reasoning: {
                type: Type.STRING,
                description: 'One sentence explanation of the score',
              },
            },
            required: ['score', 'reasoning'],
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('llm timeout')), TIMEOUT)
      ),
    ]);

    const text = response.text;
    if (!text) return FALLBACK;
    const parsed = JSON.parse(text) as { score?: number; reasoning?: string };
    return {
      score:     Math.min(1, Math.max(0, parsed.score ?? FALLBACK.score)),
      reasoning: parsed.reasoning ?? FALLBACK.reasoning,
    };
  } catch {
    return FALLBACK;
  }
}

export const LLM_MODEL = MODEL;
