async function pixelsViaSharp(buffer: Buffer): Promise<Uint8Array | null> {
  try {
    const sharp = (await import('sharp')).default;
    const { data } = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } catch {
    return null;
  }
}

export async function computeDHash(imageBuffer: Buffer): Promise<string | null> {
  const pixels = await pixelsViaSharp(imageBuffer);
  if (!pixels) return null;

  const bits: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits.push(pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? 1 : 0);
    }
  }
  return bits.join('');
}

export async function computeDHashFromUrl(
  url: string,
  timeoutMs = 12000
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BustemBot/1.0)' },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return computeDHash(buf);
  } catch {
    return null;
  }
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function hashSimilarity(hash: string | null, refs: string[]): number {
  if (!hash || refs.length === 0) return 0;
  const validRefs = refs.filter(Boolean);
  if (validRefs.length === 0) return 0;
  const minDist = Math.min(...validRefs.map((r) => hammingDistance(hash, r)));
  return 1 - minDist / 64;
}
