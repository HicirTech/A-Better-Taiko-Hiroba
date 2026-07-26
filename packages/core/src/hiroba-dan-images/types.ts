import type { DanClearState } from "../hiroba-models";

/** What one plate says: which dan it is, and whether it is stamped. */
export interface PlateReading {
  readonly dan: number;
  readonly state: DanClearState;
}

/**
 * What a my-page label says: the highest passed dan.
 *
 * Only the dan. The label's styling does encode the clear tier, but the colour bands of 赤フルコン
 * and 金クリア run close together and only one 赤フルコン label has ever been seen, so guessing
 * from them would be a coin toss dressed as an answer. The plate for that dan states the tier
 * exactly; ask it.
 */
export interface LabelReading {
  readonly dan: number;
}

export type DanImageFailure =
  | NotAnImageFailure
  | UnreadableGlyphFailure
  | PlateDanMismatchFailure
  | IndeterminateStampFailure;

/** The bytes did not decode, or are not the size this endpoint serves. */
export interface NotAnImageFailure {
  readonly kind: "notAnImage";
  readonly width: number | null;
  readonly height: number | null;
}

/**
 * No template matched the glyph closely enough. Carries what the nearest one was, so a named rank
 * arriving on a label — the one gap in the label templates — is recognisable in a log rather than
 * silently mistaken for its nearest neighbour.
 */
export interface UnreadableGlyphFailure {
  readonly kind: "unreadableGlyph";
  readonly nearestDan: number | null;
  readonly nearestDistance: number | null;
}

/** The plate's own name says a different dan than the caller asked for. */
export interface PlateDanMismatchFailure {
  readonly kind: "plateDanMismatch";
  readonly requestedDan: number;
  readonly plateDan: number;
}

/** The plate decoded and carries a stamp, but its colours fit no known state. Never guess. */
export interface IndeterminateStampFailure {
  readonly kind: "indeterminateStamp";
  readonly dan: number;
}
