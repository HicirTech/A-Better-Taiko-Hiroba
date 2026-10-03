import type { DanClearState } from "../hiroba-models";

export interface PlateReading {
  readonly dan: number;
  readonly state: DanClearState;
}

/** Only the dan: the label's styling hints at the clear tier, but that dan's plate states it. */
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

/** No template was close enough; the nearest is kept so an uncovered named rank shows in a log. */
export interface UnreadableGlyphFailure {
  readonly kind: "unreadableGlyph";
  readonly nearestDan: number | null;
  readonly nearestDistance: number | null;
}

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
