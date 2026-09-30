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

/**
 * The どんメダル plate imgsrc_tokenplate.php draws for `id`: a band in a colour the id and the state
 * pick, so each season has a plate of its own, and one more once `complete`, as Hiroba's art may
 * change then (unverified). No count and no COMPLETE on it: my page writes those as text over it.
 */
export function medalPlatePng(id: string, complete: boolean): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(3, complete ? 1 : 0, ...Array.from(id, (c) => c.charCodeAt(0))));
  return platePng(next, [next() % 256, next() % 256, next() % 256], false);
}

/** A My Don portrait, as the picture host draws one: square, at Hiroba's own size. */
const PORTRAIT_SIDE = 290;

/**
 * The portrait of a Don wearing `set`, a costume's eight values in any fixed order: a body disc and
 * a face disc in colours the set picks, on a clear ground, with noise in the lowest bit, so every
 * set has a portrait of its own, about the size of a real one (60 KB).
 */
export function myDonPng(set: readonly number[]): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(4, ...set));
  const body = [next() % 256, next() % 256, next() % 256];
  const face = [next() % 256, next() % 256, next() % 256];
  const side = PORTRAIT_SIDE;
  const middle = (side - 1) / 2;
  const data = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const noise = next();
      const fromMiddle = (x - middle) ** 2 + (y - middle) ** 2;
      const inBody = fromMiddle <= (side * 0.45) ** 2;
      const inFace = fromMiddle <= (side * 0.25) ** 2;
      const [r = 0, g = 0, b = 0] = inFace ? face : body;
      data.set([r ^ (noise & 1), g, b, inBody ? 255 : 0], (y * side + x) * 4);
    }
  }
  return new Uint8Array(encode({ width: side, height: side, data, channels: 4 }));
}

/** The score panel's art, as image/sp/640/total_score_image_<level>.png is: 600×356. */
const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 356;
/**
 * Where my page writes the panel's counts over it, in the units of its 280-wide box and 166 rows
 * (mypage_top.php's inline styles): the left of each column, and the top of each row.
 */
const PANEL_COLUMNS = [57, 141, 230] as const;
const PANEL_ROWS = [18, 54, 85, 121] as const;
/** Each spot my page writes a count on, as [column, row]: 虹極, the 雅s, the 粋s, the crowns. */
const PANEL_SPOTS = [
  [2, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [0, 3],
  [1, 3],
  [2, 3],
] as const;
/** The panel's grounds: dark under the ranks, whose counts are white, pale under the crowns'. */
const RANKS_GROUND = [0x2d, 0x3a, 0x78] as const;
const CROWNS_GROUND = [0xf7, 0xef, 0xd9] as const;

/**
 * The score panel of `level`, the art my page writes its counts over: a dark ground under the
 * three rows of ranks and a pale one under the crowns, and left of each spot a count goes on, a
 * square in a colour of its own where Hiroba draws that rank's or crown's icon, the spot itself
 * left plain. Noise in the lowest bit makes it tens of KB, as a real one is.
 */
export function scorePanelPng(level: number): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(5, level));
  const width = PANEL_WIDTH;
  const height = PANEL_HEIGHT;
  const x = (units: number) => (units * width) / 280;
  const y = (units: number) => (units * height) / 166;
  const icons = PANEL_SPOTS.map(([column, row]) => {
    const left = PANEL_COLUMNS[column] ?? 0;
    const top = PANEL_ROWS[row] ?? 0;
    return {
      left: x(left - 44),
      right: x(left - 6),
      top: y(top - 3),
      bottom: y(top + 24),
      colour: [next() % 256, next() % 256, next() % 256],
    };
  });
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const noise = next();
      const icon = icons.find(
        (box) => column >= box.left && column < box.right && row >= box.top && row < box.bottom,
      );
      const ground = row < y(113) ? RANKS_GROUND : CROWNS_GROUND;
      const [r = 0, g = 0, b = 0] = icon?.colour ?? ground;
      data.set([r ^ (noise & 1), g, b, 255], (row * width + column) * 4);
    }
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
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
