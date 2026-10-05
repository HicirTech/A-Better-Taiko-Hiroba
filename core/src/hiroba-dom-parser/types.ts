import type {
  CostumeSet,
  CrownState,
  DanClearState,
  FavoriteSongState,
  FolderState,
  FormToken,
  Genre,
  Level,
  NameState,
  RenameState,
  Score,
  ScoreRank,
  ScoreRecord,
  ShownSong,
  Song,
  TitleOption,
  TitleState,
} from "../hiroba-models";
import type { EditorReading } from "../hiroba-writes/types";

export interface CostumeEditorReading {
  readonly state: CostumeSet;
  readonly token: FormToken;
  readonly palette: readonly CostumeSwatch[];
  /** Owned items per slot, きぐるみ first, in page order; 0 (はずす) is unlisted: always allowed. */
  readonly slots: readonly (readonly number[])[];
}

export interface CostumeSwatch {
  readonly id: number;
  /** The colour the page draws it in, `#RRGGBB`. */
  readonly hex: string;
}

export interface TitleEditorReading {
  readonly state: TitleState;
  readonly token: FormToken;
  /** Owned titles; a name can repeat under another id. The two leading list entries are skipped. */
  readonly options: readonly TitleOption[];
}

export interface FolderEditorReading extends EditorReading<FolderState> {
  /** The filled slots' songs as the page shows them, in slot order. */
  readonly songs: readonly ShownSong[];
}

export interface FavoriteSongEditorReading extends EditorReading<FavoriteSongState> {
  /** Null when no song is set. */
  readonly song: ShownSong | null;
}

export interface RenameEditorReading {
  readonly state: NameState;
  readonly token: FormToken;
  /** The form's `maxlength`, which a browser counts in UTF-16 code units. */
  readonly maxLength: number;
  readonly rename: RenameState;
}

/** Failure kinds are codes, not sentences: the interface translates them. */
export type ParseFailure =
  | LoggedOutFailure
  | MissingMarkerFailure
  | SiteErrorFailure
  | UnreadableValueFailure
  | WrongPageFailure;

/** One genre's score list, read whole; nothing is filtered, narrowing is the caller's choice. */
export interface ScoreListReading {
  readonly songs: readonly Song[];
  readonly scores: readonly Score[];
}

/** One recent-plays row: a full record named only by title, as the page has no song number. */
export interface RecentPlay {
  readonly songTitle: string;
  /** From the title's font class: the only signal between same-titled songs. Null if unknown. */
  readonly genre: Genre | null;
  readonly level: Level;
  readonly crown: CrownState;
  readonly scoreRank: ScoreRank | null;
  readonly record: ScoreRecord;
}

export interface LoggedOutFailure {
  readonly kind: "loggedOut";
  /** The page that was requested — not the login page Hiroba answered with. */
  readonly page: string;
}

/** Hiroba's own error page, served at HTTP 200; detected on its shell, never on its message. */
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

/** Hiroba served another page: `user_profile.php` with your own taiko number serves my page. */
export interface WrongPageFailure {
  readonly kind: "wrongPage";
  readonly page: string;
  /** The page the body actually looks like, and the marker that identified it. */
  readonly looksLike: string;
  readonly marker: string;
}

export interface UnreadableValueFailure {
  readonly kind: "unreadableValue";
  readonly page: string;
  readonly marker: string;
  readonly raw: string;
}

/** Three states: `段位なし` (holds none) differs from a missing dan line (the player did not say). */
export type PlayerRowDan =
  | { readonly kind: "dan"; readonly dan: number; readonly clearState: DanClearState }
  | { readonly kind: "none" }
  | { readonly kind: "notShown" };

export interface PlayerRow {
  readonly taikoNo: string;
  readonly nickname: string;
  readonly title: string;
  /** The only place on the site where a dan and its clear tier appear as text, not pixels. */
  readonly dan: PlayerRowDan;
  readonly myDonImageUrl: string | null;
}

/** One page of player rows. An empty reading is normal; `notice` tells the empty cases apart. */
export interface PlayerListReading {
  readonly rows: readonly PlayerRow[];
  /** The `?page=N` link's number, or null. The link drops `friend_id`: rebuild your own URL. */
  readonly nextPage: number | null;
  /** The pager script's page count, or null. Capped at 10 by the site: 10 means "at least ten". */
  readonly pageCount: number | null;
  /** The site's own in-page notice when there is nothing to show, verbatim; null when absent. */
  readonly notice: string | null;
}

/** A `dan_top.php` panel. Whether the dan is passed is only in the plate image, not the HTML. */
export interface DanBoardPanel {
  /** Board order, 1–19. 1–15 are 五級…十段; 16–19 are the four named ranks. */
  readonly dan: number;
  readonly name: string;
  readonly plateImageUrl: string;
  /** True if rendered for this account; false is shared static art, which proves nothing else. */
  readonly plateIsRendered: boolean;
  /** `dan_detail.php?dan=N` for 1–15; null for the named ranks, which have no detail page. */
  readonly detailUrl: string | null;
}

export interface DanBoardReading {
  readonly panels: readonly DanBoardPanel[];
}

/** Which table, from the page's `#rank` input; the three share one markup, so it is required. */
export type RankScope = "japan" | "prefecture" | "world";

export interface RankingEntry {
  readonly position: number;
  readonly playerName: string;
  /** From the row's profile link, the only place the row names an id. */
  readonly taikoNo: string;
  readonly score: number;
  readonly myDonImageUrl: string | null;
  /** `score_detail.php` link for this chart; null means a closed profile, not a gap in the page. */
  readonly detailUrl: string | null;
}

/** One page of one chart's ranking table. Nothing here is current: see `stalenessNotice`. */
export interface RankingReading {
  readonly scope: RankScope;
  /** Read back from the page header, since rows name only players: a reading must say its chart. */
  readonly songTitle: string;
  readonly level: number | null;
  /** The prefecture id for a `prefecture` reading, null for the other two. */
  readonly area: number | null;
  readonly entries: readonly RankingEntry[];
  /** The `page=N` the pager offers in each direction, or null where it offers none. */
  readonly nextPage: number | null;
  readonly previousPage: number | null;
  /** The site's daily-staleness sentence, verbatim; on `rank_detail.php` pages only. */
  readonly stalenessNotice: string | null;
  /** `ランキングデータがありません`: a chart nobody ranked is an ordinary 200 page, not the error page. */
  readonly notice: string | null;
}

export interface RankListSong {
  readonly title: string;
  /** `level` → the `rank_detail.php` URL the page offers for that chart. */
  readonly chartUrls: Readonly<Record<number, string>>;
}

/** A genre's songs on `rank_list.php`; it omits 【双打】 songs, which the score list carries. */
export interface RankListReading {
  readonly scope: RankScope;
  readonly songs: readonly RankListSong[];
}
