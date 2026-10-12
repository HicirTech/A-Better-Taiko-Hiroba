/** Dan plates drawn from core's plate templates, with a stamp when passed: none of Hiroba's art. */
import {
  decodeTemplate,
  GLYPH_GRID_HEIGHT,
  GLYPH_GRID_WIDTH,
  PLATE_HEIGHT,
  PLATE_NAME_TEMPLATES,
  PLATE_WIDTH,
} from "@abth/core";
import { encode } from "fast-png";

type Rgb = readonly [number, number, number];

const SILVER_PLATE: Rgb = [205, 208, 218];
const TEAL_PLATE: Rgb = [80, 170, 180];
const NAME_INK: Rgb = [10, 10, 10];
const STAMP_INK: Rgb = [20, 20, 20];
const WHITE_SWIRL: Rgb = [250, 250, 250];
const RED_GLYPH: Rgb = [200, 35, 25];
/** Neither red nor gold: a stamp whose colours fit none of the six states. */
const BLUE_GLYPH: Rgb = [40, 70, 200];

/** A red clear's stamp, one in colours no state has, or none. */
export type PlateStamp = "redClear" | "unknownColours" | null;
/** Where the reader looks for the name, and where the stamp sits. */
const NAME = { x0: 185, x1: 395, y0: 30, y1: 170 } as const;
const STAMP = { cx: 500, cy: 99, swirl: 55, ring: 78 } as const;

/** A plate for `dan` carrying `stamp`; the named ranks' plates are silver. */
export function danPlatePng(dan: number, stamp: PlateStamp): Uint8Array {
  const template = PLATE_NAME_TEMPLATES[dan];
  if (template === undefined) {
    throw new Error(`No plate template for dan ${dan}`);
  }
  const data = new Uint8Array(PLATE_WIDTH * PLATE_HEIGHT * 3);
  const put = (x: number, y: number, rgb: Rgb) => data.set(rgb, (y * PLATE_WIDTH + x) * 3);
  const background = dan >= 16 ? SILVER_PLATE : TEAL_PLATE;
  for (let y = 0; y < PLATE_HEIGHT; y++) {
    for (let x = 0; x < PLATE_WIDTH; x++) {
      put(x, y, background);
    }
  }
  paintName(decodeTemplate(template), (x, y) => put(x, y, NAME_INK));
  if (stamp !== null) {
    for (let y = 0; y < PLATE_HEIGHT; y++) {
      for (let x = 0; x < PLATE_WIDTH; x++) {
        const d = Math.hypot(x - STAMP.cx, y - STAMP.cy);
        if (d < STAMP.swirl) {
          put(x, y, WHITE_SWIRL);
        } else if (d < STAMP.ring) {
          put(x, y, STAMP_INK);
        }
      }
    }
    for (let y = STAMP.cy - 25; y < STAMP.cy + 25; y++) {
      for (let x = STAMP.cx - 30; x < STAMP.cx + 30; x++) {
        put(x, y, stamp === "redClear" ? RED_GLYPH : BLUE_GLYPH);
      }
    }
  }
  return new Uint8Array(encode({ width: PLATE_WIDTH, height: PLATE_HEIGHT, data, channels: 3 }));
}

// Every inked cell gets a pixel at least, or the name's bounding box, which the reader scales by,
// would shrink.
function paintName(grid: Float64Array, ink: (x: number, y: number) => void): void {
  const cellW = (NAME.x1 - NAME.x0) / GLYPH_GRID_WIDTH;
  const cellH = (NAME.y1 - NAME.y0) / GLYPH_GRID_HEIGHT;
  for (let gy = 0; gy < GLYPH_GRID_HEIGHT; gy++) {
    for (let gx = 0; gx < GLYPH_GRID_WIDTH; gx++) {
      const value = grid[gy * GLYPH_GRID_WIDTH + gx] ?? 0;
      if (value <= 0) continue;
      const px0 = Math.round(NAME.x0 + gx * cellW);
      const px1 = Math.round(NAME.x0 + (gx + 1) * cellW);
      const py0 = Math.round(NAME.y0 + gy * cellH);
      const py1 = Math.round(NAME.y0 + (gy + 1) * cellH);
      let budget = Math.max(1, Math.round(value * (px1 - px0) * (py1 - py0)));
      for (let y = py0; y < py1 && budget > 0; y++) {
        for (let x = px0; x < px1 && budget > 0; x++) {
          ink(x, y);
          budget--;
        }
      }
    }
  }
}
