import { decode } from "fast-png";

import type { DanClearState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { DanImageFailure } from "./types";

/** Every plate observed so far is exactly this size. */
export const PLATE_WIDTH = 640;
export const PLATE_HEIGHT = 198;

/**
 * Where the 合格 stamp lives: the plate's right portion, pulled in from the bevelled frame so the
 * frame's dark pixels never count as ink.
 */
const REGION = { x0: 400, x1: 605, y0: 20, y1: 178 } as const;

/**
 * A stamp announces itself by its black ink ring: stamped plates measure blackFrac 0.265–0.271 in
 * the region against 0.021 for every unstamped plate, whatever the background — the silver
 * named-rank plates that fool a whiteness test never get near this.
 */
const STAMP_BLACK_FRACTION = 0.12;

/**
 * Classification happens only inside the central 60% of the ink ring's bounding box, where no
 * plate background can reach. The stamp encodes two dimensions there, and the measured
 * populations separate cleanly on all three axes:
 *
 * - the swirl names the achievement — rainbow (ドンダフル) has a cool-hue fraction of 0.065
 *   against ≤ 0.013 for the others; among those, the white swirl (クリア) fills ≥ 0.130 of the
 *   inner box with white against ≤ 0.081 for the gold swirl (フルコン);
 * - the glyph colour names the tier — 赤 glyphs count 4855–5001 red pixels where 金 stamps
 *   count at most 146.
 */
const INNER_SHRINK = 0.6;
const DONDERFUL_COOL_FRACTION = 0.03;
const CLEAR_WHITE_FRACTION = 0.105;
const RED_TIER_FLOOR = 1000;
const GLYPH_SANITY_FLOOR = 500;

/**
 * Reads the 合格 stamp off a plate's pixels into one of the seven states.
 *
 * The background never decides anything. Plate background colour belongs to the dan tier (kyu
 * gold-yellow, low dan teal, high dan red, named ranks silver), so an unpassed high-dan plate is
 * red all over — the stamp is found by its ink ring, and every colour judgement happens inside
 * the ring where only the swirl and the glyphs exist.
 */
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

  // First pass: how much of the region is ink, and where the ink ring sits.
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

  // Second pass, central portion of the ring only: swirl and glyphs, nothing else.
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
