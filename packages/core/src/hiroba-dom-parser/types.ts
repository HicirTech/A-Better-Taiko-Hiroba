import type { Score, Song } from "../hiroba-models";

/** Failure kinds are codes, not sentences: the interface translates them (see epic #13). */
export type ParseFailure = LoggedOutFailure | MissingMarkerFailure | UnreadableValueFailure;

/**
 * One genre's score list, read whole: the songs it names and one list-fidelity Score per chart.
 * Nothing is filtered out — `none` and `played` rows are information, and any narrowing is the
 * caller's choice, never the parser's.
 */
export interface ScoreListReading {
  readonly songs: readonly Song[];
  readonly scores: readonly Score[];
}

export interface LoggedOutFailure {
  readonly kind: "loggedOut";
  /** The page that was requested — not the login page Hiroba answered with. */
  readonly page: string;
}

export interface MissingMarkerFailure {
  readonly kind: "missingMarker";
  readonly page: string;
  /** The CSS selector that found nothing. */
  readonly marker: string;
}

/** The marker was found, but what it held could not be read as the expected shape. */
export interface UnreadableValueFailure {
  readonly kind: "unreadableValue";
  readonly page: string;
  readonly marker: string;
  /** What the page actually held there, for the log that investigates this. */
  readonly raw: string;
}
