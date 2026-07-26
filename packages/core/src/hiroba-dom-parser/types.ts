import type { CrownState, Level, Score, ScoreRecord, Song } from "../hiroba-models";

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

/**
 * One row of the recent-plays page: a chart's full record, named only by title.
 *
 * The page carries no song number anywhere — no anchor, no query string — so a row cannot become
 * a Score on its own. Everything else is there: read on both pages, one chart's row and its
 * detail page agree field for field, and the row additionally knows サポート譜面. Order is the
 * page's, newest first; there are no timestamps to carry.
 */
export interface RecentPlay {
  readonly songTitle: string;
  readonly level: Level;
  readonly crown: CrownState;
  readonly record: ScoreRecord;
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
