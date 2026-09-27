import type { FormToken } from "../hiroba-models";
import type { Transport, TransportFailure } from "../http-transport";
import type { Result } from "../operation-results";

/**
 * One ajax post a write sends, as the page's own script would build it.
 *
 * Paths are relative to Hiroba's origin with no leading slash, as the site's scripts write them.
 */
export interface AjaxPost {
  /** The endpoint, such as `ajax/change_mydon.php`. */
  readonly path: string;
  /** The page whose script sends the post, such as `mypage_kisekae.php`: sent as the Referer. */
  readonly referer: string;
  /**
   * The body, in the order the page serialises it. A form token goes in as itself and is revealed
   * only as the request is built.
   */
  readonly form: readonly (readonly [name: string, value: string | FormToken])[];
}

/**
 * What came back from an ajax post, sorted before anything reads a result code. Each kind carries
 * `code`, codes for a report: where the answer ended, its status, type and size. Never the body,
 * which can hold a fresh form token.
 */
export type AjaxAnswer =
  /**
   * JSON with a 2xx status, on Hiroba's own origin, as every answer the site's handlers were seen
   * to give. `value` stays in the core.
   */
  | { readonly kind: "json"; readonly value: unknown; readonly code: string }
  /**
   * The site's own error page at 200 (`<h1>エラー</h1>`, a bare table, no login form): the handler
   * was never reached, which is how an ajax page answers a post without `X-Requested-With`.
   */
  | { readonly kind: "rejected"; readonly code: string }
  /**
   * The answer ended on the login or card-select page. Only a signal: how an ajax page answers a
   * client that is not a browser has never been seen, so a GET decides whether the session ended.
   */
  | { readonly kind: "endedAtLogin"; readonly code: string }
  /** A plain 404: the endpoint is not there. */
  | { readonly kind: "endpointMissing"; readonly code: string }
  /**
   * Anything else: JSON that does not parse, JSON with an error status, and any answer that ended
   * off Hiroba's origin, whatever it holds.
   */
  | { readonly kind: "unexpected"; readonly code: string }
  /** The post produced no answer. After a save, that does not mean nothing was saved. */
  | {
      readonly kind: "noAnswer";
      readonly failure: TransportFailure["kind"];
      readonly code: string;
    };

/**
 * How a write's pre-check answered. Only `clear` lets the write go on to its save.
 *
 * The site's own scripts compare the pre-check's `result` loosely with true (`data.result ==
 * true`), so `true`, `1` and `"1"` all mean it wants a confirmation. Everything else that is not
 * the boolean false — `0`, `"0"`, null, a missing result, text — is a shape nobody has seen, and
 * stops the write too.
 */
export type PrecheckVerdict =
  | "clear"
  | "needsConfirmation"
  | "unexpected"
  | "rejected"
  | "endedAtLogin"
  | "endpointMissing"
  | "noAnswer";

/**
 * A page a write reads did not arrive as that page. Codes, never the page's text: `detail`, for
 * `unexpectedPage` only, says where the read ended and what the parser said.
 */
export interface HirobaReadFailure {
  readonly kind:
    | TransportFailure["kind"]
    | "loggedOut"
    | "cardSelectUnfinished"
    | "siteError"
    | "unexpectedPage";
  readonly detail?: string;
}

/** What reading a page needs: the transport, and where Hiroba is. */
export interface ReadDeps {
  readonly transport: Transport;
  /** Scheme, host and port, no trailing slash: `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
}

/** What a write needs from the platform that runs it. */
export interface WriteDeps<S> extends ReadDeps {
  readonly now: () => Date;
  /**
   * Whether to read another page before and after, to see that nothing but the edited set moved.
   * On while this kind of write is not yet verified against the real site on this platform.
   */
  readonly crossCheck: boolean;
  /**
   * Keeps a pending undo record — the set before, and the set the write means to leave — before
   * anything is posted. A throw stops the write with nothing sent.
   */
  readonly beginUndo: (before: S, expectedAfter: S) => Promise<void>;
}

/** An edit page as a write reads it: the whole set it shows, and the token that writes it. */
export interface EditorReading<S> {
  readonly state: S;
  readonly token: FormToken;
}

/** A target the write refused before sending anything, naming the field at fault. */
export interface InvalidTarget {
  readonly field: string;
}

/** A save's answer, as far as a write reads it. No token and no body travel in it. */
export interface SaveReading {
  readonly answer: AjaxAnswer["kind"];
  /** The result code, read strictly (`readSaveCode`); null when there is none. */
  readonly code: number | null;
  /** The site's own message (`errmsg`), as plain text, for showing and never for logging. */
  readonly message: string | null;
  /** Codes for a report: where the answer ended, its status, type and size. */
  readonly report: string;
}

/** Why a save left the set as it was, from the save's answer. Each endpoint has its own table. */
export type NotAppliedReason =
  /** The save said 0, success, and nothing moved: Hiroba's answer does not prove a write. */
  | { readonly kind: "unchanged" }
  | { readonly kind: "refused"; readonly code: number; readonly message: string | null }
  /** The token was no longer good (705, on the endpoints whose scripts name it). */
  | { readonly kind: "stale" }
  /** Hiroba said it is in maintenance (900 or 901, on the endpoints whose scripts name them). */
  | { readonly kind: "siteMaintenance" }
  | { readonly kind: "failed"; readonly code: number | null }
  | { readonly kind: "noAnswer" }
  | { readonly kind: "rejected" }
  | { readonly kind: "endedAtLogin" }
  | { readonly kind: "endpointMissing" }
  | { readonly kind: "unexpected" };

/** One endpoint's result codes, copied from the site's own script for it, never shared. */
export interface SaveCodes {
  readonly reason: (save: SaveReading) => NotAppliedReason;
  /**
   * The code for "saved, but not passed on to the game server; set it again", where the endpoint
   * has one. It counts only when the read-back shows the change.
   */
  readonly notSynced?: number;
}

/** Another page, read before and after a write, to see that it did not move. */
export interface CrossCheck<C> {
  readonly read: (deps: ReadDeps) => Promise<Result<C, HirobaReadFailure>>;
  readonly same: (left: C, right: C) => boolean;
}

/**
 * One kind of write: how to read its editor, what counts as the same set, how a target becomes a
 * body the server will not silently ignore, what the server leaves after it, the posts, the codes,
 * and how to read the set back. `S` is the set, `T` the target as asked for, `B` the body sent,
 * `E` the editor as read and `C` what the cross-check compares.
 */
export interface WriteSpec<S, T, B, E extends EditorReading<S>, C> {
  readonly readEditor: (deps: ReadDeps) => Promise<Result<E, HirobaReadFailure>>;
  readonly same: (left: S, right: S) => boolean;
  /** The target checked against the editor's own lists and made into a body, or refused. */
  readonly normalise: (editor: E, target: T) => Result<B, InvalidTarget>;
  /** The set the server leaves after storing `body`: its own rules, not the body's word. */
  readonly expectedAfter: (before: S, body: B) => S;
  readonly precheck?: (editor: E, body: B) => AjaxPost;
  readonly save: (editor: E, body: B) => AjaxPost;
  readonly codes: SaveCodes;
  /** The whole set, read fresh from the page that shows what is saved. */
  readonly readBack: (deps: ReadDeps) => Promise<Result<S, HirobaReadFailure>>;
  readonly cross?: CrossCheck<C>;
}

/** Why a write stopped after its pre-check, with nothing saved. */
export type StopReason =
  | "precheckUnexpected"
  | "precheckRejected"
  | "precheckAtLogin"
  | "precheckEndpointMissing"
  | "precheckNoAnswer";

/**
 * What the cross-check saw: `off` when it did not run, `unknown` when the read after the write did
 * not arrive, which is never taken as unchanged.
 */
export type CrossVerdict = "off" | "unchanged" | "changed" | "unknown";

/**
 * How a write ended. The set read back decides, not the site's answer: every outcome after a save
 * carries the set before it, and `save` only annotates.
 */
export type WriteOutcome<S> =
  /** 05:00–07:00 JST: nothing was sent at all. */
  | { readonly kind: "maintenance" }
  /** A read before any post failed; nothing was posted. */
  | { readonly kind: "readFailed"; readonly failure: HirobaReadFailure }
  /** The session ended before anything was posted. */
  | { readonly kind: "sessionGone"; readonly writeMayHaveHappened: false }
  /** The session ended after the save was sent: whether it was saved is not known. */
  | {
      readonly kind: "sessionGone";
      readonly writeMayHaveHappened: true;
      readonly before: S;
      readonly expectedAfter: S;
      readonly save: SaveReading;
    }
  /** The set is no longer the one the change was made against; nothing was posted. */
  | { readonly kind: "changedSincePreview"; readonly current: S }
  /** The target was refused before anything was posted. */
  | { readonly kind: "invalidTarget"; readonly field: string }
  /** The target is what is already there; nothing was posted. */
  | { readonly kind: "nothingToChange" }
  /** The undo record could not be kept, so nothing was posted. */
  | { readonly kind: "undoNotSaved" }
  /** The pre-check asked for a confirmation this version does not give; nothing was saved. */
  | { readonly kind: "needsConfirmation" }
  /** The pre-check did not clear the write; nothing was saved. `code` is for a report. */
  | { readonly kind: "stoppedBeforeWrite"; readonly reason: StopReason; readonly code: string }
  | {
      readonly kind: "applied";
      readonly before: S;
      readonly after: S;
      readonly save: SaveReading;
      readonly cross: CrossVerdict;
    }
  /** Read back as planned, and the site said it did not reach the game server. */
  | {
      readonly kind: "appliedNotSynced";
      readonly before: S;
      readonly after: S;
      readonly save: SaveReading;
      readonly cross: CrossVerdict;
    }
  | {
      readonly kind: "notApplied";
      readonly before: S;
      readonly after: S;
      readonly reason: NotAppliedReason;
      readonly save: SaveReading;
      readonly cross: CrossVerdict;
    }
  /** The set moved, but not to where the write meant it to; or the cross-checked page moved. */
  | {
      readonly kind: "diverged";
      readonly before: S;
      readonly expectedAfter: S;
      readonly after: S;
      readonly save: SaveReading;
      readonly cross: CrossVerdict;
    }
  /** The save was sent and the set could not be read back: what happened is not known. */
  | {
      readonly kind: "outcomeUnknown";
      readonly before: S;
      readonly expectedAfter: S;
      readonly save: SaveReading;
      readonly failure: HirobaReadFailure;
    };
