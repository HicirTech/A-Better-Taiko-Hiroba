import sharp from "sharp";

/** WebP's limit on either side. */
const WEBP_MAX_SIDE = 16383;
// Near-lossless at 60 moves no channel by more than about two steps, at a quarter of the PNG.
const NEAR_LOSSLESS_QUALITY = 60;

/** A drawn chart as a near-lossless WebP, or null for a drawing WebP cannot hold. */
export async function webpOf(png: Uint8Array): Promise<Uint8Array | null> {
  const { width = 0, height = 0 } = await sharp(png).metadata();
  if (width < 1 || height < 1 || width > WEBP_MAX_SIDE || height > WEBP_MAX_SIDE) {
    return null;
  }
  const webp = await sharp(png)
    .webp({ nearLossless: true, quality: NEAR_LOSSLESS_QUALITY, effort: 6 })
    .toBuffer();
  return new Uint8Array(webp);
}
