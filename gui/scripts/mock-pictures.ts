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
const CREST = [0xe0, 0x40, 0x80] as const;

/** A plate's shape: its height, the row its band starts on, and what it draws over the band. */
interface PlateShape {
  readonly height: number;
  readonly bandTop: number;
  /** A crest at the right, beside a portrait standing above the plate. */
  readonly crest: boolean;
  /** The row a tab of the band rises to, under such a portrait; null for none. */
  readonly tabTop: number | null;
}

const BAND_ONLY: PlateShape = { height: PLATE_HEIGHT, bandTop: 0, crest: false, tabTop: null };
/** A title plate keeps room over its band, as Hiroba's does. */
export const TITLE_PLATE = {
  width: PLATE_WIDTH,
  height: 164,
  bandTop: 67,
  crest: true,
  tabTop: 55,
} as const satisfies PlateShape & { readonly width: number };

/** The plate of a player wearing `title` ("" for none). */
export function titlePlatePng(title: string): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(1, ...Array.from(title, (c) => c.codePointAt(0) ?? 0)));
  return platePng(next, [next() % 256, next() % 256, next() % 256], true, TITLE_PLATE);
}

/** The plate without a session: a PNG no check on its bytes can tell from a player's. */
export function blankPlatePng(): Uint8Array<ArrayBuffer> {
  return platePng(randomFrom(seedOf(2)), [0x9a, 0x9a, 0x9a], false, {
    ...TITLE_PLATE,
    crest: false,
    tabTop: null,
  });
}

/** One plate per id and state; no count or COMPLETE on it, my page writes those as text. */
export function medalPlatePng(id: string, complete: boolean): Uint8Array<ArrayBuffer> {
  // A complete plate gets its own picture too: Hiroba's art may change then (unverified).
  const next = randomFrom(seedOf(3, complete ? 1 : 0, ...Array.from(id, (c) => c.charCodeAt(0))));
  return platePng(next, [next() % 256, next() % 256, next() % 256], false, BAND_ONLY);
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

/** The legends' icons: image/sp/640/best_score_rank_<2..8>_640.png and crown_0<1..4>_640.png. */
const RANK_ICON = { width: 128, height: 96 } as const;
const CROWN_ICON = { width: 52, height: 59 } as const;
/** A chart's difficulty: image/sp/640/icon_course02_<1..5>_640.png. */
const COURSE_ICON = { width: 64, height: 64 } as const;
/** A play option: image/sp/640/status_10_<code>_640.png, 90 pixels square as Hiroba's are. */
const OPTION_ICON = { width: 90, height: 90 } as const;

/** The pixels `inside` in one colour of the seed's own: only the size is Hiroba's. */
function iconPng(
  seed: number,
  { width, height }: { readonly width: number; readonly height: number },
  inside: (x: number, y: number) => boolean,
): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seed);
  const [r = 0, g = 0, b = 0] = [next() % 256, next() % 256, next() % 256];
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set([r ^ (next() & 1), g, b, inside(x, y) ? 255 : 0], (y * width + x) * 4);
    }
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}

/** A diamond for a rank's image number, 2 to 8. */
export function rankIconPng(rank: number): Uint8Array<ArrayBuffer> {
  const { width, height } = RANK_ICON;
  return iconPng(
    seedOf(6, rank),
    RANK_ICON,
    (x, y) => Math.abs(x - width / 2) / (width / 2) + Math.abs(y - height / 2) / (height / 2) <= 1,
  );
}

/** A base with three studs for a crown's image number, 1 to 4. */
export function crownIconPng(number: number): Uint8Array<ArrayBuffer> {
  const { width, height } = CROWN_ICON;
  const studs = [0.2, 0.5, 0.8].map((at) => ({ x: width * at, y: height * 0.3 }));
  return iconPng(seedOf(7, number), CROWN_ICON, (x, y) => {
    const onBase = y >= height * 0.55 && y < height * 0.9;
    const onStud = studs.some((s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= (width * 0.12) ** 2);
    return onBase || onStud;
  });
}

/** A square with a margin for a play option, `a1` to `a35`; the code's number makes its colour. */
export function optionIconPng(code: string): Uint8Array<ArrayBuffer> {
  const margin = OPTION_ICON.width * 0.1;
  const far = OPTION_ICON.width - margin;
  return iconPng(
    seedOf(9, Number(code.slice(1))),
    OPTION_ICON,
    (x, y) => x >= margin && x < far && y >= margin && y < far,
  );
}

/** A disc for a chart's difficulty, 1 (かんたん) to 5 (the inner おに). */
export function courseIconPng(number: number): Uint8Array<ArrayBuffer> {
  const radius = COURSE_ICON.width / 2;
  return iconPng(
    seedOf(8, number),
    COURSE_ICON,
    (x, y) => (x - radius) ** 2 + (y - radius) ** 2 <= radius ** 2,
  );
}

const CHART_PICTURE_HEIGHT = 120;
const NOTE_SPACING = 40;
const NOTE_RADIUS = 14;
const DON = [0xe8, 0x4a, 0x4a] as const;
const KA = [0x4a, 0x9a, 0xe8] as const;

/** How wide the stand-in's chart picture at a place in its list is: each is wider than the last. */
export const chartPictureWidth = (at: number) => 200 + 40 * at;

/** A strip of notes, red and blue by turns, on a pale ground of its place's own. */
export function chartPicturePng(at: number): Uint8Array<ArrayBuffer> {
  const next = randomFrom(seedOf(8, at));
  const ground = [0xe0 + (next() % 32), 0xe0 + (next() % 32), 0xe0 + (next() % 32)];
  const width = chartPictureWidth(at);
  const height = CHART_PICTURE_HEIGHT;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fromCentre = ((x % NOTE_SPACING) - NOTE_SPACING / 2) ** 2 + (y - height / 2) ** 2;
      const note = Math.floor(x / NOTE_SPACING) % 2 === 0 ? DON : KA;
      const [r = 0, g = 0, b = 0] = fromCentre <= NOTE_RADIUS ** 2 ? note : ground;
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}

function platePng(
  next: () => number,
  band: readonly number[],
  boxes: boolean,
  shape: PlateShape,
): Uint8Array<ArrayBuffer> {
  const width = PLATE_WIDTH;
  const { height, bandTop, tabTop } = shape;
  const bandHeight = height - bandTop;
  // Hiroba's layout, in the units of its 290-wide plate and its band's 47 rows.
  const x = (units: number) => (units * width) / 290;
  const y = (units: number) => bandTop + (units * bandHeight) / 47;
  const radius = bandHeight / 2;
  const crest = { x: x(262), y: bandTop / 2, radius: bandTop * 0.4 };
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const noise = next();
      const nearEnd = Math.min(column, width - 1 - column);
      const inBand =
        row >= bandTop &&
        (nearEnd >= radius ||
          (radius - nearEnd) ** 2 + (row - bandTop - radius) ** 2 <= radius ** 2);
      const inTab =
        tabTop !== null && row >= tabTop && row < bandTop && column >= x(135) && column < x(155);
      const inCrest =
        shape.crest && (column - crest.x) ** 2 + (row - crest.y) ** 2 <= crest.radius ** 2;
      const inRow = boxes && row >= y(23) && row < y(46);
      const colour = inCrest
        ? CREST
        : !inRow
          ? band
          : column >= x(10) && column < x(145)
            ? NAME_BOX
            : column >= x(145) && column < x(280)
              ? DAN_BOX
              : band;
      const [r = 0, g = 0, b = 0] = colour;
      const drawn = inBand || inTab || inCrest;
      data.set([r ^ (noise & 1), g, b, drawn ? 255 : 0], (row * width + column) * 4);
    }
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}
