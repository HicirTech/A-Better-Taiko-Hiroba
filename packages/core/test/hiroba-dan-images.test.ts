/**
 * The real plates are Bandai Namco art and stay out of the repository, so these tests build
 * synthetic images: the same geometry (a 640×198 plate whose stamp is an ink ring around a swirl,
 * a 96×40 RGBA label whose glyph is its opaque region), none of the art. What they prove is the
 * reader's behaviour — that shapes are matched, that colours are judged only inside the stamp, and
 * that anything unrecognised is refused instead of rounded to its nearest neighbour.
 */
import { describe, expect, test } from "bun:test";
import { decode, encode } from "fast-png";

import {
  classifyStamp,
  type DanClearState,
  decodeTemplate,
  GLYPH_GRID_HEIGHT,
  GLYPH_GRID_WIDTH,
  highestPassedDan,
  isErr,
  isOk,
  LABEL_TEMPLATES,
  matchGlyph,
  measureGlyph,
  PLATE_HEIGHT,
  PLATE_NAME_TEMPLATES,
  PLATE_WIDTH,
  readDanLabel,
  readDanPlate,
} from "../src/index";

type Rgb = readonly [number, number, number];

const RED_PLATE: Rgb = [225, 70, 50];
const TEAL_PLATE: Rgb = [80, 170, 180];
const SILVER_PLATE: Rgb = [205, 208, 218];
const KYU_PLATE: Rgb = [250, 225, 160];
const RED_GLYPH: Rgb = [200, 35, 25];
const GOLD_GLYPH: Rgb = [230, 175, 40];

/** The template grid for a dan, expanded back into ink fractions. */
function templateGrid(dan: number, templates: Readonly<Record<number, string>>): Float64Array {
  const template = templates[dan];
  if (template === undefined) {
    throw new Error(`no template for dan ${dan}`);
  }
  return decodeTemplate(template);
}

/**
 * Paints a glyph whose measured shape is the template again: each cell gets ink over the fraction
 * of its area the template records, and any cell the template says is non-empty gets at least one
 * pixel — otherwise the ink's bounding box would shrink and the measurement would normalise to a
 * different frame.
 */
function paintTemplate(
  grid: Float64Array,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  ink: (x: number, y: number) => void,
): void {
  const cellW = (x1 - x0) / GLYPH_GRID_WIDTH;
  const cellH = (y1 - y0) / GLYPH_GRID_HEIGHT;
  for (let gy = 0; gy < GLYPH_GRID_HEIGHT; gy++) {
    for (let gx = 0; gx < GLYPH_GRID_WIDTH; gx++) {
      const value = grid[gy * GLYPH_GRID_WIDTH + gx] as number;
      if (value <= 0) continue;
      const px0 = Math.round(x0 + gx * cellW);
      const px1 = Math.round(x0 + (gx + 1) * cellW);
      const py0 = Math.round(y0 + gy * cellH);
      const py1 = Math.round(y0 + (gy + 1) * cellH);
      const area = (px1 - px0) * (py1 - py0);
      let budget = Math.max(1, Math.round(value * area));
      for (let y = py0; y < py1 && budget > 0; y++) {
        for (let x = px0; x < px1 && budget > 0; x++) {
          ink(x, y);
          budget--;
        }
      }
    }
  }
}

/**
 * Paints a plate carrying the real name shape of `dan`, so the reader has something it can
 * genuinely recognise, plus an optional stamp at the real position.
 */
function makePlate(
  dan: number,
  background: Rgb,
  glyph: Rgb | null,
  swirl: "white" | "gold" | "rainbow" = "white",
): Uint8Array {
  const data = new Uint8Array(PLATE_WIDTH * PLATE_HEIGHT * 3);
  const put = (x: number, y: number, [r, g, b]: Rgb) => {
    const i = (y * PLATE_WIDTH + x) * 3;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  };
  for (let y = 0; y < PLATE_HEIGHT; y++) {
    for (let x = 0; x < PLATE_WIDTH; x++) {
      put(x, y, background);
    }
  }

  paintTemplate(templateGrid(dan, PLATE_NAME_TEMPLATES), 185, 395, 30, 170, (x, y) =>
    put(x, y, [10, 10, 10]),
  );

  if (glyph !== null) {
    const cx = 500;
    const cy = 99;
    const rainbow: readonly Rgb[] = [
      [240, 120, 200],
      [110, 200, 240],
      [130, 220, 120],
      [245, 220, 100],
    ];
    for (let y = 0; y < PLATE_HEIGHT; y++) {
      for (let x = 0; x < PLATE_WIDTH; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 55) {
          const hue =
            rainbow[Math.floor((Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI / 2)) % 4];
          const fill: Rgb =
            swirl === "rainbow" && hue !== undefined
              ? hue
              : swirl === "gold"
                ? [235, 185, 70]
                : [250, 250, 250];
          put(x, y, fill);
        } else if (d < 78) {
          put(x, y, [20, 20, 20]);
        }
      }
    }
    for (let y = cy - 25; y < cy + 25; y++) {
      for (let x = cx - 30; x < cx + 30; x++) {
        put(x, y, glyph);
      }
    }
  }
  return new Uint8Array(encode({ width: PLATE_WIDTH, height: PLATE_HEIGHT, data, channels: 3 }));
}

/** Paints a label whose opaque silhouette is the real shape of `dan`'s name, in any text colour. */
function makeLabel(dan: number, text: Rgb = [20, 20, 20]): Uint8Array {
  const width = 96;
  const height = 40;
  const data = new Uint8Array(width * height * 4);
  paintTemplate(templateGrid(dan, LABEL_TEMPLATES), 0, width, 0, height, (x, y) => {
    const i = (y * width + x) * 4;
    data[i] = text[0];
    data[i + 1] = text[1];
    data[i + 2] = text[2];
    data[i + 3] = 255;
  });
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}

describe("the templates are well formed", () => {
  test("every rank on the board has a plate template of the right size", () => {
    for (let dan = 1; dan <= 19; dan++) {
      const template = PLATE_NAME_TEMPLATES[dan];
      expect(template).toBeDefined();
      expect(template).toHaveLength(GLYPH_GRID_WIDTH * GLYPH_GRID_HEIGHT);
      expect(template).toMatch(/^[0-9a-f]+$/);
    }
  });

  test("label templates cover the numbered ranks, and say so by their absence above them", () => {
    for (let dan = 1; dan <= 15; dan++) {
      expect(LABEL_TEMPLATES[dan]).toBeDefined();
    }
    for (const namedRank of [16, 17, 18, 19]) {
      expect(LABEL_TEMPLATES[namedRank]).toBeUndefined();
    }
  });

  test("no two templates in a set are the same shape", () => {
    for (const templates of [PLATE_NAME_TEMPLATES, LABEL_TEMPLATES]) {
      const shapes = Object.values(templates);
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  test("every template is separated from every other by a wide margin", () => {
    // The reader accepts a match under 1.5 on plates; the nearest pair must sit well beyond that,
    // or two ranks could be confused by a small rendering difference.
    const dans = Object.keys(PLATE_NAME_TEMPLATES).map(Number);
    let closest = Number.POSITIVE_INFINITY;
    for (const a of dans) {
      for (const b of dans) {
        if (a >= b) continue;
        const match = matchGlyph(
          templateGrid(a, PLATE_NAME_TEMPLATES),
          { [b]: PLATE_NAME_TEMPLATES[b] as string },
          Number.POSITIVE_INFINITY,
          0,
        );
        closest = Math.min(closest, match?.distance ?? Number.POSITIVE_INFINITY);
      }
    }
    expect(closest).toBeGreaterThan(3);
  });
});

describe("measureGlyph", () => {
  test("normalises by the ink's bounding box, so position and padding do not matter", () => {
    const mask = (blockX: number, blockY: number) => (x: number, y: number) =>
      x >= blockX && x < blockX + 20 && y >= blockY && y < blockY + 10;
    const a = measureGlyph(mask(5, 5), { x0: 0, x1: 100, y0: 0, y1: 50 });
    const b = measureGlyph(mask(60, 30), { x0: 0, x1: 100, y0: 0, y1: 50 });

    expect(a).not.toBeNull();
    expect(Array.from(a as Float64Array)).toEqual(Array.from(b as Float64Array));
  });

  test("returns null when there is no ink at all", () => {
    expect(measureGlyph(() => false, { x0: 0, x1: 10, y0: 0, y1: 10 })).toBeNull();
  });
});

describe("matchGlyph", () => {
  test("refuses a shape that sits far from everything rather than picking the nearest", () => {
    const noise = new Float64Array(GLYPH_GRID_WIDTH * GLYPH_GRID_HEIGHT).fill(0.5);

    expect(matchGlyph(noise, PLATE_NAME_TEMPLATES, 1.5, 1)).toBeNull();
  });

  test("refuses when two templates are equally close, however near they are", () => {
    const grid = templateGrid(9, PLATE_NAME_TEMPLATES);
    const ambiguous = {
      9: PLATE_NAME_TEMPLATES[9] as string,
      99: PLATE_NAME_TEMPLATES[9] as string,
    };

    expect(matchGlyph(grid, ambiguous, 1.5, 1)).toBeNull();
  });
});

describe("readDanPlate", () => {
  test("reads the dan from the plate's own name and the state from its stamp", async () => {
    const result = readDanPlate(makePlate(9, TEAL_PLATE, RED_GLYPH), 9);

    if (!isOk(result)) {
      throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value).toEqual({ dan: 9, state: "redClear" });
  });

  test("an unstamped plate is none, whatever the background", () => {
    for (const [dan, background] of [
      [15, RED_PLATE],
      [16, SILVER_PLATE],
      [1, KYU_PLATE],
    ] as const) {
      const result = readDanPlate(makePlate(dan, background, null), dan);
      if (!isOk(result)) {
        throw new Error(`expected a reading for dan ${dan}`);
      }
      expect(result.value.state).toBe("none");
    }
  });

  test("a red stamp on a red plate still reads red — the background never votes", () => {
    const result = readDanPlate(makePlate(14, RED_PLATE, RED_GLYPH), 14);

    if (!isOk(result)) {
      throw new Error("expected a reading");
    }
    expect(result.value.state).toBe("redClear");
  });

  test("the swirl names the achievement in both tiers", () => {
    const cases = [
      [makePlate(15, RED_PLATE, RED_GLYPH, "gold"), 15, "redFullCombo"],
      [makePlate(6, TEAL_PLATE, GOLD_GLYPH, "gold"), 6, "goldFullCombo"],
      [makePlate(2, TEAL_PLATE, GOLD_GLYPH, "rainbow"), 2, "goldDonderful"],
      [makePlate(1, KYU_PLATE, RED_GLYPH, "rainbow"), 1, "redDonderful"],
    ] as const;
    for (const [bytes, dan, expected] of cases) {
      const result = readDanPlate(bytes, dan);
      if (!isOk(result)) {
        throw new Error(`expected a reading for dan ${dan}`);
      }
      expect(result.value.state).toBe(expected);
    }
  });

  test("reads the named ranks too, which no dictionary of stamps could cover", () => {
    for (const dan of [16, 17, 18, 19]) {
      const result = readDanPlate(makePlate(dan, SILVER_PLATE, GOLD_GLYPH, "rainbow"), dan);
      if (!isOk(result)) {
        throw new Error(`expected a reading for dan ${dan}, got ${JSON.stringify(result)}`);
      }
      expect(result.value).toEqual({ dan, state: "goldDonderful" });
    }
  });

  test("a plate whose name disagrees with the request fails naming both", () => {
    const result = readDanPlate(makePlate(12, TEAL_PLATE, null), 9);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({ kind: "plateDanMismatch", requestedDan: 9, plateDan: 12 });
  });

  test("bytes that are not a plate fail as notAnImage", () => {
    const garbage = readDanPlate(new Uint8Array([1, 2, 3, 4]), 5);
    if (!isErr(garbage)) {
      throw new Error("expected a failure");
    }
    expect(garbage.error.kind).toBe("notAnImage");

    const wrongSize = new Uint8Array(
      encode({ width: 10, height: 10, data: new Uint8Array(300), channels: 3 }),
    );
    const small = readDanPlate(wrongSize, 5);
    if (!isErr(small)) {
      throw new Error("expected a failure");
    }
    expect(small.error).toEqual({ kind: "notAnImage", width: 10, height: 10 });
  });
});

describe("readDanLabel", () => {
  /**
   * A label is 96×40, so a grid cell covers about twelve pixels and a painted glyph can only
   * express coverage in twelfths. Real labels are drawn glyphs and reproduce their template far
   * more finely than that, so a synthetic label cannot stand in for one at the reader's threshold.
   * The contracts are therefore tested where they actually live: colour-independence in the
   * measurement, identification in the matcher, and here only what the whole path owes regardless
   * of precision — that it never answers with the wrong dan.
   */
  test("never mistakes one dan for another, however imprecise the glyph", () => {
    for (let dan = 1; dan <= 15; dan++) {
      const result = readDanLabel(makeLabel(dan));
      if (isOk(result)) {
        expect(result.value.dan).toBe(dan);
      } else {
        expect(result.error.kind).toBe("unreadableGlyph");
      }
    }
  });

  test("the measurement ignores what colour the text is drawn in", () => {
    const silhouette = (bytes: Uint8Array) => {
      const image = decode(bytes);
      const grid = measureGlyph(
        (x, y) => (image.data[(y * image.width + x) * 4 + 3] as number) > 60,
        {
          x0: 0,
          x1: image.width,
          y0: 0,
          y1: image.height,
        },
      );
      return Array.from(grid as Float64Array);
    };

    const black = silhouette(makeLabel(14, [20, 20, 20]));
    const gold = silhouette(makeLabel(14, [235, 185, 70]));
    const rainbow = silhouette(makeLabel(14, [240, 120, 200]));

    expect(gold).toEqual(black);
    expect(rainbow).toEqual(black);
  });

  test("each label template identifies itself, well clear of the runner-up", () => {
    for (const dan of Object.keys(LABEL_TEMPLATES).map(Number)) {
      const match = matchGlyph(templateGrid(dan, LABEL_TEMPLATES), LABEL_TEMPLATES, 0.4, 0.2);
      expect(match?.key).toBe(dan);
      expect(match?.runnerUpDistance).toBeGreaterThan(0.4);
    }
  });

  test("a named rank, which no label template covers, is refused rather than rounded", () => {
    // Stand-in for a shape the set does not hold: a plate template is a different rendering of a
    // dan name, so it is exactly the kind of near-miss that must not be forced onto a neighbour.
    const foreign = templateGrid(17, PLATE_NAME_TEMPLATES);

    expect(matchGlyph(foreign, LABEL_TEMPLATES, 0.4, 0.2)).toBeNull();
  });

  test("a blank label is refused — a dan-less account and an unknown number look the same", () => {
    const blank = new Uint8Array(
      encode({ width: 96, height: 40, data: new Uint8Array(96 * 40 * 4), channels: 4 }),
    );

    const result = readDanLabel(blank);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error.kind).toBe("unreadableGlyph");
  });
});

describe("highestPassedDan", () => {
  test("the highest stamped plate wins, whatever its tier", () => {
    const states = new Map<number, DanClearState>([
      [1, "goldDonderful"],
      [8, "redClear"],
      [9, "redDonderful"],
      [10, "none"],
      [15, "none"],
    ]);
    expect(highestPassedDan(states)).toBe(9);
  });

  test("no dan passed is null — a normal state", () => {
    expect(
      highestPassedDan(
        new Map<number, DanClearState>([
          [1, "none"],
          [2, "none"],
        ]),
      ),
    ).toBeNull();
  });
});

describe("classifyStamp", () => {
  test("reports the dan it was asked about when a stamp makes no sense", () => {
    // A stamp-shaped ink ring with a colourless middle: structure says stamped, colour says
    // nothing, so the reader must refuse rather than pick a tier.
    const result = classifyStamp(makePlate(9, TEAL_PLATE, [128, 128, 128]), 9);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({ kind: "indeterminateStamp", dan: 9 });
  });
});
