export { decodeTemplate, matchGlyph, measureGlyph } from "./glyph-matcher";
export type { GlyphMatch, InkMask } from "./glyph-matcher";
export {
  GLYPH_GRID_HEIGHT,
  GLYPH_GRID_WIDTH,
  LABEL_TEMPLATES,
  PLATE_NAME_TEMPLATES,
} from "./glyph-templates";
export { highestPassedDan, readDanLabel, readDanPlate } from "./plate-reader";
export { classifyStamp, PLATE_HEIGHT, PLATE_WIDTH } from "./stamp-classifier";
export type {
  DanImageFailure,
  IndeterminateStampFailure,
  LabelReading,
  NotAnImageFailure,
  PlateDanMismatchFailure,
  PlateReading,
  UnreadableGlyphFailure,
} from "./types";
