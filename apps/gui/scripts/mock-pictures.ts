/**
 * The mock's pictures of things Hiroba draws for the app to show: synthetic PNGs made with
 * fast-png, each seeded by what it stands for, so no two share their bytes. None is Bandai Namco
 * art, and none is copied from a real answer.
 */
import { encode } from "fast-png";

/** A costume item's thumbnail, as imgsrc_kisekae.php draws one: square, about Hiroba's size. */
const THUMBNAIL_SIDE = 40;

/** The same numbers on every run, from a seed: xorshift32. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state ^ (state << 13)) >>> 0;
    state = (state ^ (state >>> 17)) >>> 0;
    state = (state ^ (state << 5)) >>> 0;
    return state;
  };
}

/** FNV-1a over a few whole numbers. */
function seedOf(...values: readonly number[]): number {
  let seed = 0x811c9dc5;
  for (const value of values) {
    seed = Math.imul(seed ^ value, 0x01000193) >>> 0;
  }
  return seed;
}

/**
 * The thumbnail of item `cos` in slot `type`: a disc in a colour of its own on a clear ground, with
 * a band whose height is the slot, and noise in the low bits, so every pair has its own picture and
 * each is well over the app's smallest thumbnail.
 */
export function thumbnailPng(type: number, cos: number): Uint8Array {
  const next = randomFrom(seedOf(type, cos));
  const colour = [next() % 256, next() % 256, next() % 256];
  const side = THUMBNAIL_SIDE;
  const middle = (side - 1) / 2;
  const data = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const noise = next();
      const inDisc = (x - middle) ** 2 + (y - middle) ** 2 <= (side / 2 - 2) ** 2;
      const inBand = y >= side - 4 * type && y < side - 4 * (type - 1);
      const [r = 0, g = 0, b = 0] = inBand ? [255 - (colour[0] ?? 0), 64, 64] : colour;
      data.set(
        [r ^ (noise & 15), g ^ ((noise >>> 4) & 15), b ^ ((noise >>> 8) & 15), inDisc ? 255 : 0],
        (y * side + x) * 4,
      );
    }
  }
  return new Uint8Array(encode({ width: side, height: side, data, channels: 4 }));
}
