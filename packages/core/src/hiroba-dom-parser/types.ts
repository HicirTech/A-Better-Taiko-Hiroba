import type {
  CrownState,
  Genre,
  Level,
  Score,
  ScoreRank,
  ScoreRecord,
  Song,
} from "../hiroba-models";

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
 * a Score on its own. Everything else is there: a row holds the same record the chart's detail
 * page holds, and additionally knows サポート譜面. Order is the page's, newest first; there are no
 * timestamps to carry.
 */
export interface RecentPlay {
  readonly songTitle: string;
  /**
   * The row's genre, carried only by the title's font class, and the one signal that can separate
   * two songs sharing a title. Null when the class names a genre outside Hiroba's eight.
   */
  readonly genre: Genre | null;
  readonly level: Level;
  readonly crown: CrownState;
  /** Beside `crown` rather than inside the record, so it sits where a Score's rank sits. */
  readonly scoreRank: ScoreRank | null;
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
