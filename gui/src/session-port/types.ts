import type {
  CostumeEditorView,
  CostumeSet,
  FavoriteSongEditorView,
  FavoriteSongState,
  FolderEditorView,
  FolderState,
  MedalProgress,
  NameState,
  PickableSongs,
  RenameState,
  Result,
  ScoreRank,
  ShownSong,
  TitleEditorView,
  TitleState,
  TitleTarget,
  WriteOutcome,
} from "@abth/core";

import type { PipelineView } from "../pipelines/pipeline-view";
import type {
  ChineseNamesRead,
  Difficulty,
  SongCatalogueFailure,
  SongCatalogueRead,
} from "../song-catalogue/types";
import type { UpdateFeed, UpdateFeedFailure } from "../updates/update-feed";

export type {
  ChineseNamesRead,
  CostumeEditorView,
  CostumeSet,
  FavoriteSongEditorView,
  FavoriteSongState,
  FolderEditorView,
  FolderState,
  NameState,
  PickableSongs,
  RenameState,
  ShownSong,
  SongCatalogueFailure,
  SongCatalogueRead,
  TitleEditorView,
  TitleState,
  TitleTarget,
  UpdateFeed,
  UpdateFeedFailure,
};

export type SignInOutcome =
  | { readonly kind: "signedIn" }
  | { readonly kind: "cancelled" }
  /** Landed, but no session cookie was there to take. */
  | { readonly kind: "noSession" }
  /** The platform could not open a sign-in view at all. */
  | { readonly kind: "unavailable" }
  /** The sign-in view was sent off the two sites it may open. Only the host crosses, never a path
   * or query: those carry the OAuth state. */
  | { readonly kind: "refused"; readonly host: string };

/** A dan's board number as core numbers it: 1 (五級) to 15 (十段), then 16 to 19 for the four named
 * ranks, which my page's label has never shown. */
export type DanNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19;

/** The dan my page's label names. `unreadable` carries codes a user can copy into a report;
 * `picture` is the label's own bytes, so it never disagrees with the name beside it. */
export type DanView =
  | { readonly board: DanNumber; readonly picture: PictureView | null }
  | { readonly unreadable: true; readonly code: string; readonly picture: PictureView | null };

/** What the interface shows of a profile: JSON-safe, with no taiko number or URL (the dan label's
 * carries the number), so only the dan read off it crosses, with the label's bytes. */
export interface ProfileView {
  readonly nickname: string;
  /** "" when the player wears no title, a normal state. */
  readonly title: string;
  /** Only decides what to show: the rename itself reads the page again before it sends anything. */
  readonly rename: RenameState;
  /** Null when the page gives none, or 未設定. */
  readonly region: string | null;
  /** Null when my page shows no label, a normal state: plenty of accounts hold no dan. */
  readonly dan: DanView | null;
  readonly crowns: { readonly silver: number; readonly gold: number; readonly donderful: number };
  /** Hiroba's overall panel: the number on its image, and the count in each score rank. */
  readonly panel: {
    readonly countLevel: number;
    readonly ranks: Readonly<Record<ScoreRank, number>>;
  };
  /** The どんメダル plate, or null when the page shows none, a normal state. An `unrecognised`
   * plate carries a code, never the page's text. */
  readonly medal: { readonly name: string; readonly progress: MedalProgress } | null;
  /** The 大好きな曲's title, or null when it is 未設定. */
  readonly favoriteSong: string | null;
  /** The お気に入り folder's titles in page order; empty is a normal state. */
  readonly favoriteFolder: readonly string[];
  /** ISO 8601, when the page was read. */
  readonly fetchedAt: string;
}

/** Codes, not sentences: each has exactly one `failure.*` key in @abth/i18n. */
export type ReadFailureKind =
  | "notSignedIn"
  | "loggedOut"
  | "cardSelectUnfinished"
  | "unreachable"
  | "timedOut"
  | "cancelled"
  | "siteError"
  | "unexpectedPage";

export interface ReadFailure {
  readonly kind: ReadFailureKind;
  /** For `unexpectedPage` only: codes a user can copy into a report (path, status, content type,
   * size, parser verdict, selector). Never page text, a query string or a cookie. */
  readonly detail?: string;
}

/** Why Hiroba's picture of a costume set did not come, as codes a user can copy into a report.
 * Never the picture's URL or query, never a cookie. */
export interface CostumePreviewFailure {
  readonly code: string;
}

/** A costume slot as Hiroba numbers it in a thumbnail's `type`: 1 is the きぐるみ, 5 the ぷちキャラ. */
export type CostumeSlot = 1 | 2 | 3 | 4 | 5;

/** One of the panel's three crowns, as `ProfileView.crowns` names them. */
export type CrownKind = keyof ProfileView["crowns"];

/** One of Hiroba's pictures as the interface asks for it: what it shows, never where it is. The
 * platform builds the address itself, from a fixed path and checked numbers. */
export type PictureWant =
  | {
      readonly kind: "costumeItem";
      readonly slot: CostumeSlot;
      readonly id: number;
    }
  | { readonly kind: "titlePlate" }
  | { readonly kind: "scorePanel" }
  | { readonly kind: "medalPlate" }
  | { readonly kind: "myDon" }
  | { readonly kind: "rankIcon"; readonly rank: ScoreRank }
  | { readonly kind: "crownIcon"; readonly crown: CrownKind }
  | { readonly kind: "courseIcon"; readonly difficulty: Difficulty };

/** The pictures that are icons of the legends: shared art, the same for every account. */
export type IconWant = Extract<PictureWant, { readonly kind: "rankIcon" | "crownIcon" }>;
/** A chart's difficulty as Hiroba draws it: shared art, the same for every account. */
export type CourseIconWant = Extract<PictureWant, { readonly kind: "courseIcon" }>;

/** A picture for the interface: a `data:image/png` URL, which is no address, and the PNG's own
 * size, so its box can be sized before it is drawn. */
export interface PictureView {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/** Why a picture did not come, as codes a user can copy into a report: `<kind>=<why>`, then what
 * came back. Never a host, a URL, a query or a cookie. */
export interface PictureFailure {
  readonly code: string;
}

/** The set each kind of write changes: all the state it is made against. */
export interface WriteSets {
  readonly costume: CostumeSet;
  readonly title: TitleState;
  readonly name: NameState;
  readonly folder: FolderState;
  readonly favoriteSong: FavoriteSongState;
}

/** The kinds of write: the costume (きせかえ), the title (称号), the Donder name (ドンだーネーム), the
 * お気に入り folder and the 大好きな曲. */
export type WriteKind = keyof WriteSets;

/** A costume write as asked by the interface: the set it was made against, and the set wanted. */
export interface CostumeChange {
  readonly expected: CostumeSet;
  readonly target: CostumeSet;
}

/** A title write as the interface asks for it: the title worn as the title page showed it, and the
 * title wanted, by the id and name the page's list gave it. */
export interface TitleChange {
  readonly expected: TitleState;
  readonly target: TitleTarget;
}

/** A rename as the interface asks for it: the name as my page showed it, and the name wanted. */
export interface NameChange {
  readonly expected: NameState;
  readonly target: NameState;
}

/** The favourites as their two editors show them. */
export interface FavoritesView {
  readonly folder: FolderEditorView;
  readonly song: FavoriteSongEditorView;
}

/** A folder write as the interface asks for it: the folder as its editor showed it, and the songs
 * wanted, which fill the first slots in order and leave the rest empty. */
export interface FolderChange {
  readonly expected: FolderState;
  /** At most 30 song numbers, none twice. */
  readonly target: readonly string[];
}

/** A 大好きな曲 write: the song as its editor showed it, and the song wanted, or none. */
export interface FavoriteSongChange {
  readonly expected: FavoriteSongState;
  readonly target: FavoriteSongState;
}

/** How a write ended per the core's `runWrite`, or was refused by the platform before it began. */
export type WriteOutcomeView<S = CostumeSet> =
  | WriteOutcome<S>
  | { readonly kind: "notSignedIn" }
  /** An app fault, not Hiroba's answer: a post may have gone out, so the next read shows it. */
  | { readonly kind: "interrupted" }
  /** Asked while another write was queued or running: nothing sent, and never queued after it. */
  | { readonly kind: "busy" };

/** A costume set the player wore, with Hiroba's picture of it as a `data:image/png` URL when this
 * device kept one. */
export interface CostumeHistoryEntry {
  readonly set: CostumeSet;
  readonly picture: string | null;
}

export interface ReadProfileOptions {
  /** Whether the read renews the My Don portrait: every read but the session's first does unless
   * this says not, as for a read the window makes on its own after a title write. */
  readonly renewsPortrait: boolean;
}

/** Everything the interface asks of the platform and gets back: no cookie, URL, form token or
 * page text, but for the message Hiroba answers a write with, which is shown as plain text. */
export interface HirobaSessionPort {
  /** Whether this device holds a session from an earlier sign-in. Asks Hiroba nothing. */
  isSignedIn(): Promise<boolean>;
  signIn(): Promise<SignInOutcome>;
  /** Closes an open sign-in; its `signIn()` resolves as cancelled. Harmless when none is open. */
  cancelSignIn(): Promise<void>;
  /** My page, then its dan label if it shows one: one request, or two with a dan. Never retried. */
  readProfile(options?: ReadProfileOptions): Promise<Result<ProfileView, ReadFailure>>;
  /** Forgets the session on this device. Hiroba is not told. */
  signOut(): Promise<void>;
  /** The costume editor: one GET. Its form token stays with the platform. */
  openCostumeEditor(): Promise<Result<CostumeEditorView, ReadFailure>>;
  /** The title page: one GET, for the title worn and the titles the account owns. Its form token
   * stays with the platform. */
  openTitleEditor(): Promise<Result<TitleEditorView, ReadFailure>>;
  /** Hiroba's picture of `set`, as its editor shows one after every pick: one GET, never retried,
   * as a `data:image/png` URL. Changes nothing, allowed whenever signed in; the caller paces it. */
  previewCostume(set: CostumeSet): Promise<Result<string, CostumePreviewFailure>>;
  /** One of Hiroba's pictures, as `want` names it: from the store, or one pipelined GET, never
   * retried. Refused unsent when the platform's state allows no request. Rate is the caller's. */
  readPicture(want: PictureWant): Promise<Result<PictureView, PictureFailure>>;
  /** One costume write: the editor, the pre-check, one save and the read-back. Never retried. */
  changeCostume(change: CostumeChange): Promise<WriteOutcomeView>;
  /** One title write: title page, pre-check, one save, then my page read back. Never retried. */
  changeTitle(change: TitleChange): Promise<WriteOutcomeView<TitleState>>;
  /** One rename, with no pre-check: my page, one save and my page read back. Never retried. */
  changeName(change: NameChange): Promise<WriteOutcomeView<NameState>>;
  /** The signed-in player's costume history, newest first. Asks Hiroba nothing. */
  costumeHistory(): Promise<readonly CostumeHistoryEntry[]>;
  /** The update feed: one GET that carries no session, in the pipeline for other sites. */
  readUpdateFeed(): Promise<Result<UpdateFeed, UpdateFeedFailure>>;
  /** The お気に入り folder's editor, then the 大好きな曲's: two GETs. Their form tokens stay with
   * the platform. */
  openFavorites(): Promise<Result<FavoritesView, ReadFailure>>;
  /** One folder write: its editor, a GET for each slot that changes, one save, then the folder read
   * back. Never retried. */
  changeFolder(change: FolderChange): Promise<WriteOutcomeView<FolderState>>;
  /** One 大好きな曲 write: its editor, one save, then the song read back. Never retried. */
  changeFavoriteSong(change: FavoriteSongChange): Promise<WriteOutcomeView<FavoriteSongState>>;
  /** The songs Hiroba's own 大好きな曲 picker offers: its editor, the handoff that opens the picker,
   * then a GET for each of the eight genres. Its form token stays with the platform. */
  readSongPicker(): Promise<Result<PickableSongs, ReadFailure>>;
  /** taiko.wiki's songs, all or those changed since `since` (ms since 1970): one GET that carries
   * no session, in the pipeline for other sites. */
  readSongCatalogue(since: number | null): Promise<Result<SongCatalogueRead, SongCatalogueFailure>>;
  /** The Chinese wiki's official song names: one GET for each batch of 50 pages, carrying no
   * session, all in one group of the pipeline for other sites. */
  readChineseNames(): Promise<Result<ChineseNamesRead, SongCatalogueFailure>>;
  /** A picture of a chart's notes, from a chart host the song list links, kept on the device. */
  readChartPicture(url: string): Promise<Result<PictureView, PictureFailure>>;
  /** What each pipeline runs and has waiting now, and its newest `history` groups that ended.
   * Asks no site anything. */
  readPipelines(history: number): Promise<PipelinesView>;
}

/** Both pipelines as the pipelines page shows them: Hiroba's pictures apart from the rest. */
export interface PipelinesView {
  /** Hiroba's, but for its pictures. */
  readonly io: PipelineView;
  /** Hiroba's pictures: they run in Hiroba's pipeline, beside its other reads. */
  readonly pictures: PipelineView;
  /** The other sites'. */
  readonly external: PipelineView;
}
