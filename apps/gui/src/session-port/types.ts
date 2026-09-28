import type {
  CostumeEditorView,
  CostumeSet,
  MedalProgress,
  Result,
  ScoreRank,
  WriteOutcome,
} from "@abth/core";

/** The core's own shapes for the costume, which cross the port unchanged. */
export type { CostumeEditorView, CostumeSet };

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
 * The dan my page's label names: its name as Hiroba prints it, 五級 to 十段. A label that did not
 * read is `unreadable`, with codes a user can copy into a report: why, and what came back.
 *
 * `picture` is the label itself, the very bytes the dan was read off, for the interface to show as
 * Hiroba does: so it can never disagree with the name beside it, and costs no request of its own.
 * Null when what came back was not a PNG of a label's size from the label's own address; a label
 * that did not read can still carry one.
 */
export type DanView =
  | { readonly name: string; readonly picture: PictureView | null }
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
 * - `medalPlate`: the どんメダル plate the medal card is drawn on, as the last read of my page
 *   showed it. Its id stays with the platform: it names the player's season.
 */
export type PictureWant =
  | {
      readonly kind: "costumeItem";
      readonly slot: CostumeSlot;
      readonly id: number;
    }
  | { readonly kind: "titlePlate" }
  | { readonly kind: "medalPlate" };

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

/** The kinds of write the app knows how to send. One so far: the costume, きせかえ. */
export type WriteKind = "costume";

/**
 * A kind of write this run may send. `verified` is whether its first real write from the app has
 * been made and recorded; until then the interface asks for an extra confirmation, and each write
 * also reads another page before and after.
 */
export interface EnabledWrite {
  readonly kind: WriteKind;
  readonly verified: boolean;
}

/** A costume write as the interface asks for it: the set it was made against, and the set wanted. */
export interface CostumeChange {
  readonly expected: CostumeSet;
  readonly target: CostumeSet;
}

/**
 * How a write ended, as the core's `runWrite` judged it, or refused by the platform before it
 * began: `notEnabled` when this run may not send that kind, `notSignedIn` with no session, and
 * `nothingToUndo` when an undo was asked for and this device holds none it can offer.
 *
 * `interrupted` is a write this app stopped with no judgement: a fault in the app, not an answer
 * from Hiroba. A post may have gone out, so whether anything was saved is not known; the pending
 * undo stays, and the next editor read settles it.
 *
 * `busy` is a write asked for while another was queued or running: it sent nothing, and is never
 * queued to run after the other has ended.
 */
export type WriteOutcomeView =
  | WriteOutcome<CostumeSet>
  | { readonly kind: "notEnabled" }
  | { readonly kind: "notSignedIn" }
  | { readonly kind: "nothingToUndo" }
  | { readonly kind: "interrupted" }
  | { readonly kind: "busy" };

/**
 * The last write of one kind, as an undo can be offered for it: the set before it, which the undo
 * writes back, and the set it was read back as. Offered only while that set is still what this
 * device last saw, and only for the player signed in now.
 */
export interface UndoSummary {
  readonly kind: WriteKind;
  /** ISO 8601, when the write was started. */
  readonly at: string;
  readonly before: CostumeSet;
  readonly after: CostumeSet;
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
  readProfile(): Promise<Result<ProfileView, ReadFailure>>;
  /** Forgets the session on this device. Hiroba is not told. */
  signOut(): Promise<void>;
  /** The kinds of write this run may send. Asks Hiroba nothing. */
  enabledWrites(): Promise<readonly EnabledWrite[]>;
  /** The costume editor: one GET. Its form token stays with the platform. */
  openCostumeEditor(): Promise<Result<CostumeEditorView, ReadFailure>>;
  /**
   * Hiroba's picture of `set`, as its editor shows one after every pick: one GET, never retried,
   * answered as a `data:image/png` URL. A read that changes nothing, so every shell allows it while
   * signed in, and no write gate stands in front of it. The session and the picture's URL stay with
   * the platform; a failure is codes. How often it is asked for is the interface's to keep down.
   */
  previewCostume(set: CostumeSet): Promise<Result<string, CostumePreviewFailure>>;
  /**
   * One of Hiroba's pictures, as `want` names it: from the platform's store when it holds it,
   * asking Hiroba nothing, or else one GET in the queue with every other request, never retried and
   * never between a write's requests. Answered as a `data:image/png` URL and its size, or as codes.
   * Refused unsent while signed out, for an item the last editor read did not offer, for a picture
   * of my page before my page is read or when it showed none, and past the run's budget. How often and how many are asked for is the interface's to keep down.
   */
  readPicture(want: PictureWant): Promise<Result<PictureView, PictureFailure>>;
  /**
   * One costume write, the way every write goes: the editor, the pre-check, one save and the
   * read-back, four requests; six while costume writes are not verified, with my page read before
   * and after. Never retried. `notEnabled`, sending nothing, when this run may not write costumes;
   * `busy`, sending nothing, while another write is queued or running.
   */
  changeCostume(change: CostumeChange): Promise<WriteOutcomeView>;
  /** The undo this device can offer, one per kind at most. Asks Hiroba nothing. */
  pendingUndo(): Promise<readonly UndoSummary[]>;
  /**
   * Undoes the last write of `kind`: a write like any other, from the set it was read back as to
   * the set before it, with a fresh token, the pre-check and a read-back. A set changed anywhere
   * since stops it (`changedSincePreview`), and the undo is then no longer offered.
   */
  undo(kind: WriteKind): Promise<WriteOutcomeView>;
}
