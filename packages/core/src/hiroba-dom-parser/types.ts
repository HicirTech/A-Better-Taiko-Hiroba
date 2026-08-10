import type {
  CrownState,
  DanClearState,
  Genre,
  Level,
  Score,
  ScoreRank,
  ScoreRecord,
  Song,
} from "../hiroba-models";

/** Failure kinds are codes, not sentences: the interface translates them (see epic #13). */
export type ParseFailure =
  | LoggedOutFailure
  | MissingMarkerFailure
  | SiteErrorFailure
  | UnreadableValueFailure
  | WrongPageFailure;

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

/**
 * Hiroba answered with its own error page — **at HTTP 200**, like everything else it serves.
 *
 * Detected on the *shell* (`<h1>エラー</h1>` plus a bare table and no login form), never on the
 * message: four messages are known, a fifth should be expected, and a message-matching detector
 * falls straight through it. The message is carried so a caller can say which mistake was made —
 * a bad or missing parameter, a value that does not exist, a request refused for want of
 * `X-Requested-With`, or another player's privacy setting — but it is an explanation, not the test.
 *
 * Distinct from `missingMarker`, which says "this page changed"; this says "this is the error
 * page", and the two want opposite responses.
 */
export interface SiteErrorFailure {
  readonly kind: "siteError";
  readonly page: string;
  /** The message the shell carried, verbatim; empty when it carried none. */
  readonly message: string;
}

export interface MissingMarkerFailure {
  readonly kind: "missingMarker";
  readonly page: string;
  /** The CSS selector that found nothing. */
  readonly marker: string;
}

/**
 * Hiroba answered with a different page than the one that was requested, and said so in its markup
 * rather than in a status code or a redirect the fetcher could see.
 *
 * Distinct from `missingMarker` on purpose. A missing marker says "this page changed"; this says
 * "this is not that page", and the two want opposite responses — one is a bug to investigate, the
 * other is the site behaving as documented. The known case: `user_profile.php` with your **own**
 * taiko number serves my page instead, which would otherwise be parsed as a stranger whose profile
 * happens to carry a favourites folder.
 */
export interface WrongPageFailure {
  readonly kind: "wrongPage";
  /** The page that was requested. */
  readonly page: string;
  /** The page the body actually looks like, and the marker that identified it. */
  readonly looksLike: string;
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

/**
 * What a row says about that player's dan — **three states, not two.**
 *
 * `段位なし` and a missing dan line are different facts and must not collapse into one. The first
 * is the player saying they hold no dan; the second is the player not saying. Measured: on one
 * captured area search, 14 of 20 rows carry `.friendDanArea` and 6 carry none at all, and the same
 * player renders the same way under both the area and the keyword search — so it travels with the
 * player, not the query. The likely cause is their ◆段位表示設定 (`dan_disp`), which is *inference
 * from the settings form*, not something anyone has executed.
 */
export type PlayerRowDan =
  | { readonly kind: "dan"; readonly dan: number; readonly clearState: DanClearState }
  | { readonly kind: "none" }
  | { readonly kind: "notShown" };

/**
 * One player as the relationship lists and the player search print them.
 *
 * The same `.friendArea` shape serves all four pages, but **not with the same fields**: a list row
 * carries a hidden `taiko_no` and a write form, a search row carries neither. So the number comes
 * from the row's profile link, which both shapes have — and which the My Don image repeats, giving
 * a free cross-check.
 *
 * This row is the only place on the whole site where a dan and its clear tier appear as **text**;
 * everywhere else both are pixels in a server-rendered image. That makes it the independent
 * cross-check for `hiroba-dan-images`.
 */
export interface PlayerRow {
  readonly taikoNo: string;
  readonly nickname: string;
  readonly title: string;
  readonly dan: PlayerRowDan;
  readonly myDonImageUrl: string | null;
}

/**
 * One page of player rows, with what the page says about there being more.
 *
 * An empty reading is normal: an empty list, a search matching nobody and a search that never ran
 * all produce zero rows, and `notice` is how they are told apart.
 */
export interface PlayerListReading {
  readonly rows: readonly PlayerRow[];
  /**
   * The `?page=N` link the page offers, or null when it offers none. Rebuild your own URL from it
   * rather than following it verbatim: **the site drops `friend_id` from this link**, so a client
   * that follows it silently widens its own filter.
   */
  readonly nextPage: number | null;
  /**
   * The page count the page renders into its own pager script, or null when there is no pager.
   *
   * **Capped at 10 by the site**, so `10` means "at least ten" and nothing more —
   * `history_recent_score.php` reports 10 while really running to 200. Below the cap it is exact:
   * every captured empty list reports 0 and every one-page list reports 1.
   */
  readonly pageCount: number | null;
  /** The site's own in-page notice when there is nothing to show, verbatim; null when absent. */
  readonly notice: string | null;
}

/**
 * One of the nineteen panels on `dan_top.php`.
 *
 * The board is the one page that says which dan exist and in what order, and it says nothing else:
 * **whether a dan is passed is not in this HTML at all**, only in the plate image's pixels. So a
 * panel carries the image's URL and leaves the verdict to `readDanPlate`.
 */
export interface DanBoardPanel {
  /** Board order, 1–19. 1–15 are 五級…十段; 16–19 are the four named ranks. */
  readonly dan: number;
  /** The romanised name the panel prints — `FIFTH KYU`, `TENTH DAN`, `KUROTO`. */
  readonly name: string;
  readonly plateImageUrl: string;
  /**
   * True when the plate is rendered for this account (`imgsrc_dani.php?taiko_no=…`), false when
   * the board serves shared static art instead.
   *
   * On the only account seen, the fifteen numbered dan are rendered and the four named ranks serve
   * `dani_plate_16..19_no_640.png` — the `_no` form. **What the board renders for an *earned*
   * named rank has never been seen**, so nothing here may treat static art as proof of anything
   * beyond "not rendered for you".
   */
  readonly plateIsRendered: boolean;
  /** `dan_detail.php?dan=N` for 1–15; null for the named ranks, which have no detail page. */
  readonly detailUrl: string | null;
}

/** The board, in board order. */
export interface DanBoardReading {
  readonly panels: readonly DanBoardPanel[];
}
