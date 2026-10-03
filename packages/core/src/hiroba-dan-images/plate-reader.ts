import { decode } from "fast-png";

import type { DanClearState } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { matchGlyph, measureGlyph } from "./glyph-matcher";
import { LABEL_TEMPLATES, PLATE_NAME_TEMPLATES } from "./glyph-templates";
import { classifyStamp, PLATE_HEIGHT, PLATE_WIDTH } from "./stamp-classifier";
import type { DanImageFailure, LabelReading, PlateReading } from "./types";

/** The dan name sits between the tomoe logo and the stamp; the stamp never reaches into it. */
const PLATE_NAME_REGION = { x0: 185, x1: 395, y0: 30, y1: 170 } as const;

/** Thresholds sit in the measured gap between a true match and the nearest wrong template. */
const PLATE_MAX_DISTANCE = 1.5;
const PLATE_MIN_SEPARATION = 1.0;
const LABEL_MAX_DISTANCE = 0.4;
const LABEL_MIN_SEPARATION = 0.2;

/** A my-page label: RGBA at this size, with the glyph as its opaque region. */
const LABEL_WIDTH = 96;
const LABEL_HEIGHT = 40;

/** Reads a dan plate: the dan it names and its stamp; a different dan than asked for fails. */
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

/** Reads a my-page label into its dan: one request where the board takes nineteen. */
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

/** The highest plate carrying a stamp; null when nothing is passed, which is normal. */
export function highestPassedDan(states: ReadonlyMap<number, DanClearState>): number | null {
  let highest: number | null = null;
  for (const [dan, state] of states) {
    if (state !== "none" && (highest === null || dan > highest)) {
      highest = dan;
    }
  }
  return highest;
}
