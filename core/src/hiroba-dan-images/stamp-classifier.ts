import { decode } from "fast-png";

import type { DanClearState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { DanImageFailure } from "./types";

export const PLATE_WIDTH = 640;
export const PLATE_HEIGHT = 198;

/** The stamp's region, pulled in from the bevelled frame so its dark pixels never count as ink. */
const REGION = { x0: 400, x1: 605, y0: 20, y1: 178 } as const;

/** Black fraction of the region: 0.265–0.271 on stamped plates, 0.021 on every unstamped one. */
const STAMP_BLACK_FRACTION = 0.12;

/** Classify only the central 60% of the ink ring's box, where no plate background can reach. */
const INNER_SHRINK = 0.6;
const DONDERFUL_COOL_FRACTION = 0.03;
const CLEAR_WHITE_FRACTION = 0.105;
const RED_TIER_FLOOR = 1000;
const GLYPH_SANITY_FLOOR = 500;

/** Reads the 合格 stamp into one of seven states; the tier-coloured background decides nothing. */
export function classifyStamp(
  bytes: Uint8Array,
  dan: number,
): Result<DanClearState, DanImageFailure> {
  let image: ReturnType<typeof decode>;
  try {
    image = decode(bytes);
  } catch {
    return err({ kind: "notAnImage", width: null, height: null });
  }
  const { width, height, data, channels, depth } = image;
  if (width !== PLATE_WIDTH || height !== PLATE_HEIGHT || depth !== 8 || channels < 3) {
    return err({ kind: "notAnImage", width, height });
  }

  let black = 0;
  let total = 0;
  let bx0: number = REGION.x1;
  let bx1: number = REGION.x0;
  let by0: number = REGION.y1;
  let by1: number = REGION.y0;
  for (let y = REGION.y0; y < REGION.y1; y++) {
    for (let x = REGION.x0; x < REGION.x1; x++) {
      const i = (y * width + x) * channels;
      const r = data[i] as number;
      const g = data[i + 1] as number;
      const b = data[i + 2] as number;
      total++;
      if (r < 60 && g < 60 && b < 60) {
        black++;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }
  if (black / total < STAMP_BLACK_FRACTION || bx1 <= bx0 || by1 <= by0) {
    return ok("none");
  }

  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const halfW = ((bx1 - bx0) / 2) * INNER_SHRINK;
  const halfH = ((by1 - by0) / 2) * INNER_SHRINK;
  let inner = 0;
  let cool = 0;
  let white = 0;
  let red = 0;
  let gold = 0;
  for (let y = Math.round(cy - halfH); y <= cy + halfH; y++) {
    for (let x = Math.round(cx - halfW); x <= cx + halfW; x++) {
      const i = (y * width + x) * channels;
      const r = data[i] as number;
      const g = data[i + 1] as number;
      const b = data[i + 2] as number;
      inner++;
      if (r > 190 && g > 190 && b > 190) {
        white++; // the クリア swirl; フルコン's gold swirl has almost none
        continue;
      }
      if (Math.max(r, g, b) - Math.min(r, g, b) <= 50) {
        continue; // black ink and greys decide nothing
      }
      if (b > r + 20 || (g > r + 20 && b > 80)) {
        cool++; // blues, greens, purples: only the donderful rainbow swirl has these
      } else if (r > 120 && r - b > 60) {
        if (g / r < 0.45) {
          red++;
        } else if (g / r >= 0.5) {
          gold++;
        }
      }
    }
  }
  if (inner === 0 || Math.max(red, gold) < GLYPH_SANITY_FLOOR) {
    return err({ kind: "indeterminateStamp", dan });
  }
  const isRed = red > RED_TIER_FLOOR;
  if (cool / inner > DONDERFUL_COOL_FRACTION) {
    return ok(isRed ? "redDonderful" : "goldDonderful");
  }
  if (white / inner >= CLEAR_WHITE_FRACTION) {
    return ok(isRed ? "redClear" : "goldClear");
  }
  return ok(isRed ? "redFullCombo" : "goldFullCombo");
}
