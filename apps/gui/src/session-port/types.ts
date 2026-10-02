import type {
  CostumeEditorView,
  CostumeSet,
  MedalProgress,
  NameState,
  RenameState,
  Result,
  ScoreRank,
  TitleEditorView,
  TitleState,
  TitleTarget,
  WriteOutcome,
} from "@abth/core";

/** The core's own shapes for the costume, the title and the name, which cross the port unchanged. */
export type {
  CostumeEditorView,
  CostumeSet,
  NameState,
  RenameState,
  TitleEditorView,
  TitleState,
  TitleTarget,
};

export type SignInOutcome =
  | { readonly kind: "signedIn" }
  /** The user closed the sign-in view, or pressed cancel, before landing. */
  | { readonly kind: "cancelled" }
  /** Landed, but no session cookie was there to take. */
  | { readonly kind: "noSession" }
  /** The platform could not open a sign-in view at all. */
  | { readonly kind: "unavailable" }
  /**
   * The sign-in view was sent off the two sites it may open, and stopped there. Only the host
   * crosses, never a path or query: those carry the OAuth state. Only the desktop sign-in window
   * refuses navigations, so only the desktop reports this.
   */
  | { readonly kind: "refused"; readonly host: string };

/**
 * A dan's board number, as core numbers the dans: 1 (五級) to 15 (十段), and 16 to 19 for the four
 * named ranks, which my page's label has never shown. Each has a `dan.N` text in @abth/i18n.
 */
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

/**
 * The dan my page's label names, by its board number, which the interface words in its own language
 * (`dan.N`). A label that did not read is `unreadable`, with codes a user can copy into a report:
 * why, and what came back.
 *
 * `picture` is the label itself, the very bytes the dan was read off, for the interface to show as
 * Hiroba does: so it can never disagree with the name beside it, and costs no request of its own.
 * Null when what came back was not a PNG of a label's size from the label's own address; a label
 * that did not read can still carry one.
 */
export type DanView =
  | { readonly board: DanNumber; readonly picture: PictureView | null }
  | { readonly unreadable: true; readonly code: string; readonly picture: PictureView | null };

/**
 * What the interface shows of a profile: plain data that survives JSON. The taiko number is
 * deliberately not part of it, and neither is any URL — the dan label's carries the taiko number,
 * so only the dan read off it crosses, with the label's bytes. A `data:` URL here is a picture, not
 * an address: it names nothing and fetches nothing.
 */
export interface ProfileView {
  readonly nickname: string;
  /** "" when the player wears no title, a normal state. */
  readonly title: string;
  /**
   * Whether my page hands its rename dialog the flag that opens it, closes it, or none it can read.
   * It only says what to show; the rename itself reads the page again before it sends anything.
   */
  readonly rename: RenameState;
  /** Null when the page gives none, or 未設定. */
  readonly region: string | null;
  /**
   * The dan, read off the label my page shows. Null when my page shows none, a normal state:
   * plenty of accounts hold no dan.
   */
  readonly dan: DanView | null;
  readonly crowns: { readonly silver: number; readonly gold: number; readonly donderful: number };
  /** Hiroba's overall panel: the number on its image, and the count in each score rank. */
  readonly panel: {
    readonly countLevel: number;
    readonly ranks: Readonly<Record<ScoreRank, number>>;
  };
  /**
   * The どんメダル plate, or null when the page shows none, a normal state. An `unrecognised`
   * plate carries a code, never the page's text.
   */
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
  /**
   * For `unexpectedPage` only: where the read ended and what the parser said, as codes a user can
   * copy into a report — path, status, content type, size, parser verdict and selector. Never page
   * text, never a query string, never a cookie.
   */
  readonly detail?: string;
}

/**
 * Why Hiroba's picture of a costume set did not come, as codes a user can copy into a report: why,
 * then the status, content type and size, and the final path when it is not the picture's own.
 * Never the picture's URL or its query, never a cookie.
 */
export interface CostumePreviewFailure {
  readonly code: string;
}

/** A costume slot as Hiroba numbers it in a thumbnail's `type`: 1 is the きぐるみ, 5 the ぷちキャラ. */
export type CostumeSlot = 1 | 2 | 3 | 4 | 5;

/**
 * One of Hiroba's pictures, as the interface asks for it: what it shows, never where it is. The
 * platform builds the address itself, from a fixed path and these checked numbers, or from what it
 * read off my page itself. Each kind comes with the part of the app that shows it:
 *
 * - `costumeItem`: an item's thumbnail, as the costume editor shows it, for an item the last
 *   editor read offered in that slot: one it owns, or the one it wears. はずす (0) has none.
 * - `titlePlate`: the plate the identity card is drawn on, as the last read of my page showed it,
 *   under the title it showed. It names nothing more: the platform knows whose page it read.
 * - `scorePanel`: the art of the score panel my page writes its counts over, as the last read of
 *   my page showed it. The same art for every player: it shows no count.
 * - `medalPlate`: the どんメダル plate the medal card is drawn on, as the last read of my page
 *   showed it. Its id stays with the platform: it names the player's season.
 * - `myDon`: the player's My Don portrait, as the last read of my page showed it, from the one
 *   picture host off Hiroba. Its address names the taiko number, which stays with the platform.
 */
export type PictureWant =
  | {
      readonly kind: "costumeItem";
      readonly slot: CostumeSlot;
      readonly id: number;
    }
  | { readonly kind: "titlePlate" }
  | { readonly kind: "scorePanel" }
  | { readonly kind: "medalPlate" }
  | { readonly kind: "myDon" };

/**
 * A picture as it crosses to the interface: its bytes as a `data:image/png` URL, a picture and not
 * an address, and its size as the PNG gives it, so its box can be sized before it is drawn.
 */
export interface PictureView {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Why a picture did not come, as codes a user can copy into a report: `<kind>=<why>`, then what
 * came back, if anything did. Never a host, a URL, a query or a cookie.
 */
export interface PictureFailure {
  readonly code: string;
}

/**
 * The set each kind of write changes: all of the state it is made against, kept in its undo slot
 * and read back after it. A kind joins here once, and the undo store and the write verbs follow.
 */
export interface WriteSets {
  readonly costume: CostumeSet;
  readonly title: TitleState;
  readonly name: NameState;
}

/**
 * The kinds of write the app knows how to send: the costume, きせかえ, the title, 称号, and the
 * Donder name, ドンだーネーム.
 */
export type WriteKind = keyof WriteSets;

/** A costume write as the interface asks for it: the set it was made against, and the set wanted. */
export interface CostumeChange {
  readonly expected: CostumeSet;
  readonly target: CostumeSet;
}

/**
 * A title write as the interface asks for it: the title worn as the title page showed it, and the
 * title wanted, by the id and the name the page's list gave it. The platform's undo asks for a
 * title by its name alone.
 */
export interface TitleChange {
  readonly expected: TitleState;
  readonly target: TitleTarget;
}

/** A rename as the interface asks for it: the name as my page showed it, and the name wanted. */
export interface NameChange {
  readonly expected: NameState;
  readonly target: NameState;
}

/**
 * How a write ended, as the core's `runWrite` judged it, or refused by the platform before it
 * began: `notSignedIn` with no session, and `nothingToUndo` when an undo was asked for and this
 * device holds none it can offer.
 *
 * `interrupted` is a write this app stopped with no judgement: a fault in the app, not an answer
 * from Hiroba. A post may have gone out, so whether anything was saved is not known; the pending
 * undo stays, and the next editor read settles it.
 *
 * `busy` is a write asked for while another was queued or running: it sent nothing, and is never
 * queued to run after the other has ended.
 */
export type WriteOutcomeView<S = CostumeSet> =
  | WriteOutcome<S>
  | { readonly kind: "notSignedIn" }
  | { readonly kind: "nothingToUndo" }
  | { readonly kind: "interrupted" }
  | { readonly kind: "busy" };

/**
 * The last write of kind `K`, as an undo can be offered for it: the set before it, which the undo
 * writes back, and the set it was read back as. Offered only while that set is still what this
 * device last saw, and only for the player signed in now.
 */
export interface UndoSummaryOf<K extends WriteKind> {
  readonly kind: K;
  /** ISO 8601, when the write was started. */
  readonly at: string;
  readonly before: WriteSets[K];
  readonly after: WriteSets[K];
}

/** The last write of any kind, one of them: its `kind` says whose sets `before` and `after` are. */
export type UndoSummary = { readonly [K in WriteKind]: UndoSummaryOf<K> }[WriteKind];

/** What a read of my page may be asked besides the read: whether it is the user's own Read again. */
export interface ReadProfileOptions {
  /**
   * Whether the read renews the My Don portrait, which is fetched anew the next time it is asked for.
   * Every read but the session's first does, unless this says it does not: a read the window
   * makes on its own, as after a title write, says nothing of the costume. Only a costume change,
   * and the user's own Read again, renew it.
   */
  readonly renewsPortrait: boolean;
}

/**
 * Everything the interface can ask of the platform, and everything that crosses from the platform
 * layer into the interface. No cookie, no URL, no form token and no page text is part of it, but
 * for the message Hiroba answers a write with, which the interface shows as plain text.
 */
export interface HirobaSessionPort {
  /** Whether this device holds a session from an earlier sign-in. Asks Hiroba nothing. */
  isSignedIn(): Promise<boolean>;
  signIn(): Promise<SignInOutcome>;
  /** Closes an open sign-in; its `signIn()` then resolves as cancelled. Harmless when none is open. */
  cancelSignIn(): Promise<void>;
  /**
   * My page, then the dan label it shows, if it shows one: one request to Hiroba per call, or two
   * with a dan. Never retries by itself.
   */
  readProfile(options?: ReadProfileOptions): Promise<Result<ProfileView, ReadFailure>>;
  /** Forgets the session on this device. Hiroba is not told. */
  signOut(): Promise<void>;
  /** The costume editor: one GET. Its form token stays with the platform. */
  openCostumeEditor(): Promise<Result<CostumeEditorView, ReadFailure>>;
  /**
   * The title page: one GET, for the title worn and the titles the account owns. Its form token
   * stays with the platform.
   */
  openTitleEditor(): Promise<Result<TitleEditorView, ReadFailure>>;
  /**
   * Hiroba's picture of `set`, as its editor shows one after every pick: one GET, never retried,
   * answered as a `data:image/png` URL. A read that changes nothing, so it is allowed whenever the
   * window is signed in. The session and the picture's URL stay with the platform; a failure is
   * codes. How often it is asked for is the interface's to keep down.
   */
  previewCostume(set: CostumeSet): Promise<Result<string, CostumePreviewFailure>>;
  /**
   * One of Hiroba's pictures, as `want` names it: from the platform's store when it holds it,
   * asking Hiroba nothing, or else one GET in the queue with every other request, never retried and
   * never between a write's requests. Answered as a `data:image/png` URL and its size, or as codes.
   * Refused unsent while signed out, for an item the last editor read did not offer, for a picture
   * of my page before my page is read or when it showed none, for the portrait with no picture host,
   * and past the run's budget. How often and how many are asked for is the interface's to keep down.
   *
   * The My Don portrait is the one kept picture that can change under the same address: the store
   * answers it too, and it is fetched anew only after a costume write applies, or after a read of
   * my page other than a session's first, which only the user's Read again makes.
   */
  readPicture(want: PictureWant): Promise<Result<PictureView, PictureFailure>>;
  /**
   * One costume write, the way every write goes: the editor, the pre-check, one save and the
   * read-back, four requests; six where costume writes have not been made for real from this
   * platform yet, with my page read before and after (`LIVE_CHECKED_WRITES`). Never retried.
   * `busy`, sending nothing, while another write is queued or running.
   */
  changeCostume(change: CostumeChange): Promise<WriteOutcomeView>;
  /**
   * One title write, the way every write goes: the title page, the pre-check, one save and my page
   * read back for the title, four requests; six where title writes have not been made for real
   * from this platform yet, with the costume page read before and after (`LIVE_CHECKED_WRITES`).
   * Never retried. `busy`, sending nothing, while another write is queued or running.
   */
  changeTitle(change: TitleChange): Promise<WriteOutcomeView<TitleState>>;
  /**
   * One rename, the way every write goes, with no pre-check: my page for the editor, one save and
   * my page read back for the name, three requests; five where renames have not been made for real
   * from this platform yet, with my page read before and after for the title (`LIVE_CHECKED_WRITES`).
   * Never retried. `busy`, sending nothing, while another write is queued or running.
   */
  changeName(change: NameChange): Promise<WriteOutcomeView<NameState>>;
  /** The undo this device can offer, one per kind at most. Asks Hiroba nothing. */
  pendingUndo(): Promise<readonly UndoSummary[]>;
  /**
   * Undoes the last write of `kind`: a write like any other, from the set it was read back as to
   * the set before it, with a fresh token, the pre-check and a read-back. A set changed anywhere
   * since stops it (`changedSincePreview`), and the undo is then no longer offered. A title is put
   * back by the name it had, and only when that name is exactly one title of today's list.
   */
  undo<K extends WriteKind>(kind: K): Promise<WriteOutcomeView<WriteSets[K]>>;
}
