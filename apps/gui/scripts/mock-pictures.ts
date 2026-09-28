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
export function thumbnailPng(type: number, cos: number): Uint8Array<ArrayBuffer> {
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

/**
 * A title plate, as imgsrc_titleplate.php draws one: wide and low. Not the 290:47 the app reserves
 * before a plate comes, on purpose, so a test sees the card take the size the PNG gives.
 */
const PLATE_WIDTH = 600;
const PLATE_HEIGHT = 100;
/** The name row's two boxes, sampled from Hiroba's plate: the name's cream and the dan's blue. */
const NAME_BOX = [0xf8, 0xf0, 0xe0] as const;
const DAN_BOX = [0x5a, 0x8d, 0xf2] as const;

/**
 * The plate of a player wearing `title` ("" for none): a band in a colour the title picks, and in
 * its lower half the name row's cream box and blue box where Hiroba's plate has them, with noise in
 * the lowest bit, so each title has a plate of its own, about the size of a real one (16 KB).
 */
export function titlePlatePng(title: string): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(1, ...Array.from(title, (c) => c.codePointAt(0) ?? 0)));
  return platePng(next, [next() % 256, next() % 256, next() % 256], true);
}

/**
 * The plate imgsrc_titleplate.php draws for no one, without a session: a PNG like any plate, a grey
 * band with no boxes, which no check on its bytes can tell from a player's.
 */
export function blankPlatePng(): Uint8Array<ArrayBuffer> {
  return platePng(randomFrom(seedOf(2)), [0x9a, 0x9a, 0x9a], false);
}

/** A plate's pixels: rounded ends, `band` above, and the two boxes below when `boxes`. */
function platePng(
  next: () => number,
  band: readonly number[],
  boxes: boolean,
): Uint8Array<ArrayBuffer> {
  const width = PLATE_WIDTH;
  const height = PLATE_HEIGHT;
  // Hiroba's layout, in the units of its 290-wide plate and its 47 rows.
  const x = (units: number) => (units * width) / 290;
  const y = (units: number) => (units * height) / 47;
  const radius = height / 2;
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const noise = next();
      const nearEnd = Math.min(column, width - 1 - column);
      const inside =
        nearEnd >= radius || (radius - nearEnd) ** 2 + (row - radius) ** 2 <= radius ** 2;
      const inRow = boxes && row >= y(23) && row < y(46);
      const colour = !inRow
        ? band
        : column >= x(10) && column < x(145)
          ? NAME_BOX
          : column >= x(145) && column < x(280)
            ? DAN_BOX
            : band;
      const [r = 0, g = 0, b = 0] = colour;
      data.set([r ^ (noise & 1), g, b, inside ? 255 : 0], (row * width + column) * 4);
    }
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}
