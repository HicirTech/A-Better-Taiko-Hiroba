/**
 * Reads the dan board out of its images, because the HTML never says it: which dans are passed,
 * with which clear tier, is drawn as a 合格 stamp on the plate, and the my-page label is a picture
 * of the dan's name.
 *
 * Nothing here is OCR. The site renders nineteen fixed names in a fixed font, so a name is read by
 * matching its shape against nineteen measured templates, and the stamp is read from its structure
 * — the ink ring, the swirl behind the glyphs, and the glyph colour. Both refuse rather than round:
 * a shape that matches nothing, or a stamp whose colours fit no state, is a named failure.
 *
 * The wiki's Reading-Dan-and-Rankings page records the evidence behind the encoding.
 */
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
