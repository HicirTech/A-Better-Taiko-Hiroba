/** Synthetic PNGs standing in for Hiroba's pictures. No Bandai Namco art, nothing copied. */
import { encode } from "fast-png";

const THUMBNAIL_SIDE = 40;

/** xorshift32: the same numbers on every run for a seed, used as noise to reach a real size. */
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

/** Not the proportions the app reserves, on purpose: a test sees the plate take the PNG's size. */
const PLATE_WIDTH = 600;
const PLATE_HEIGHT = 100;
const NAME_BOX = [0xf8, 0xf0, 0xe0] as const;
const DAN_BOX = [0x5a, 0x8d, 0xf2] as const;

/** The plate of a player wearing `title` ("" for none). */
export function titlePlatePng(title: string): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(1, ...Array.from(title, (c) => c.codePointAt(0) ?? 0)));
  return platePng(next, [next() % 256, next() % 256, next() % 256], true);
}

/** The plate without a session: a PNG no check on its bytes can tell from a player's. */
export function blankPlatePng(): Uint8Array<ArrayBuffer> {
  return platePng(randomFrom(seedOf(2)), [0x9a, 0x9a, 0x9a], false);
}

/** One plate per id and state; no count or COMPLETE on it, my page writes those as text. */
export function medalPlatePng(id: string, complete: boolean): Uint8Array<ArrayBuffer> {
  // A complete plate gets its own picture too: Hiroba's art may change then (unverified).
  const next = randomFrom(seedOf(3, complete ? 1 : 0, ...Array.from(id, (c) => c.charCodeAt(0))));
  return platePng(next, [next() % 256, next() % 256, next() % 256], false);
}

const PORTRAIT_SIDE = 290;

/** The portrait of a Don wearing `set`, a costume's eight values in any fixed order. */
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

/** The score panel's art, image/sp/640/total_score_image_<level>.png, is 600×356. */
const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 356;
/** Where my page writes the counts, in units of its 280×166 box: column lefts, row tops. */
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
const RANKS_GROUND = [0x2d, 0x3a, 0x78] as const;
const CROWNS_GROUND = [0xf7, 0xef, 0xd9] as const;

/** Icon squares where Hiroba draws each rank's and crown's icon, the count spots left plain. */
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
