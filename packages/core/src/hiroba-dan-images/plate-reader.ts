import { decode } from "fast-png";

import type { DanClearState } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { matchGlyph, measureGlyph } from "./glyph-matcher";
import { LABEL_TEMPLATES, PLATE_NAME_TEMPLATES } from "./glyph-templates";
import { classifyStamp, PLATE_HEIGHT, PLATE_WIDTH } from "./stamp-classifier";
import type { DanImageFailure, LabelReading, PlateReading } from "./types";

/** The dan name sits between the tomoe logo and the stamp; the stamp never reaches into it. */
const PLATE_NAME_REGION = { x0: 185, x1: 395, y0: 30, y1: 170 } as const;

/**
 * Match thresholds, set from the spread measured across every collected image: on plates a true
 * match never exceeded 0.30 while the nearest wrong one never came under 3.9, and on labels the
 * same figures are 0.18 and 0.74. The limits sit in those gaps with room on both sides.
 */
const PLATE_MAX_DISTANCE = 1.5;
const PLATE_MIN_SEPARATION = 1.0;
const LABEL_MAX_DISTANCE = 0.4;
const LABEL_MIN_SEPARATION = 0.2;

/** A my-page label: RGBA at this size, with the glyph as its opaque region. */
const LABEL_WIDTH = 96;
const LABEL_HEIGHT = 40;

/**
 * Reads one dan plate (`imgsrc_dani.php?dan=N`): which dan it names, and how it is stamped.
 *
 * `requestedDan` is what the caller asked the site for. The plate states its own dan in glyphs, so
 * the two are compared: a mismatch means the fetch and the file have come apart, which is worth a
 * failure rather than a plausible-looking answer.
 */
export function readDanPlate(
  bytes: Uint8Array,
  requestedDan: number,
): Result<PlateReading, DanImageFailure> {
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

  const grid = measureGlyph((x, y) => {
    const i = (y * width + x) * channels;
    return (data[i] as number) < 90 && (data[i + 1] as number) < 90 && (data[i + 2] as number) < 90;
  }, PLATE_NAME_REGION);
  if (grid === null) {
    return err({ kind: "unreadableGlyph", nearestDan: null, nearestDistance: null });
  }
  const match = matchGlyph(grid, PLATE_NAME_TEMPLATES, PLATE_MAX_DISTANCE, PLATE_MIN_SEPARATION);
  if (match === null) {
    return err({ kind: "unreadableGlyph", nearestDan: null, nearestDistance: null });
  }
  if (match.key !== requestedDan) {
    return err({ kind: "plateDanMismatch", requestedDan, plateDan: match.key });
  }

  const state = classifyStamp(bytes, match.key);
  if (isErr(state)) {
    return state;
  }
  return ok({ dan: match.key, state: state.value });
}

/**
 * Reads a my-page label (`imgsrc_danlabel.php`) into the dan it names.
 *
 * One request answers "which dan is this account on", where reading the board takes nineteen. The
 * clear tier is deliberately not read here — see `LabelReading`.
 */
export function readDanLabel(bytes: Uint8Array): Result<LabelReading, DanImageFailure> {
  let image: ReturnType<typeof decode>;
  try {
    image = decode(bytes);
  } catch {
    return err({ kind: "notAnImage", width: null, height: null });
  }
  const { width, height, data, channels } = image;
  if (width !== LABEL_WIDTH || height !== LABEL_HEIGHT || channels !== 4) {
    return err({ kind: "notAnImage", width, height });
  }

  const grid = measureGlyph((x, y) => (data[(y * width + x) * 4 + 3] as number) > 60, {
    x0: 0,
    x1: width,
    y0: 0,
    y1: height,
  });
  if (grid === null) {
    // A dan-less account's label is blank. So is the answer for a taiko number that does not
    // exist, so this says nothing about whether the account is real.
    return err({ kind: "unreadableGlyph", nearestDan: null, nearestDistance: null });
  }
  const match = matchGlyph(grid, LABEL_TEMPLATES, LABEL_MAX_DISTANCE, LABEL_MIN_SEPARATION);
  if (match === null) {
    return err({ kind: "unreadableGlyph", nearestDan: null, nearestDistance: null });
  }
  return ok({ dan: match.key });
}

/**
 * The current dan, derived: the highest plate carrying a stamp. Null when nothing is passed —
 * a normal state, not a failure.
 *
 * The my-page label shows the same thing and would be a one-request cross-check, but nothing wires
 * the two together yet: `readDanLabel` has no caller outside its own tests. Until something does,
 * this is the only answer, not the corroborated one.
 */
export function highestPassedDan(states: ReadonlyMap<number, DanClearState>): number | null {
  let highest: number | null = null;
  for (const [dan, state] of states) {
    if (state !== "none" && (highest === null || dan > highest)) {
      highest = dan;
    }
  }
  return highest;
}
