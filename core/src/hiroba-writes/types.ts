import type { FormToken } from "../hiroba-models";
import type { Transport, TransportFailure } from "../http-transport";
import type { Result } from "../operation-results";

export interface AjaxPost {
  /** The endpoint, relative to Hiroba's origin with no leading slash: `ajax/change_mydon.php`. */
  readonly path: string;
  /** The page whose script sends the post, such as `mypage_kisekae.php`: sent as the Referer. */
  readonly referer: string;
  /** The body in the page's order; a form token stays a token until the request is built. */
  readonly form: readonly (readonly [name: string, value: string | FormToken])[];
}

/** `code` is for a report: end, status, type and size. Never the body: it can hold a token. */
export type AjaxAnswer =
  /** JSON with a 2xx status on Hiroba's origin, like every handler seen; `value` stays in core. */
  | { readonly kind: "json"; readonly value: unknown; readonly code: string }
  /** The site's error page at 200: the handler was never reached, e.g. no `X-Requested-With`. */
  | { readonly kind: "rejected"; readonly code: string }
  /** Ended on the login or card-select page: a signal only, a GET decides if the session ended. */
  | { readonly kind: "endedAtLogin"; readonly code: string }
  | { readonly kind: "endpointMissing"; readonly code: string }
  /** Anything else: bad JSON, an error status, or an answer that ended off Hiroba's origin. */
  | { readonly kind: "unexpected"; readonly code: string }
  /** The post produced no answer. After a save, that does not mean nothing was saved. */
  | {
      readonly kind: "noAnswer";
      readonly failure: TransportFailure["kind"];
      readonly code: string;
    };

/** How a pre-check answered; only `clear` lets the write go on to its save. */
export type PrecheckVerdict =
  | "clear"
  | "needsConfirmation"
  | "unexpected"
  | "rejected"
  | "endedAtLogin"
  | "endpointMissing"
  | "noAnswer";

/** A page a write reads did not arrive as that page: codes only, `detail` for `unexpectedPage`. */
export interface HirobaReadFailure {
  readonly kind:
    | TransportFailure["kind"]
    | "loggedOut"
    | "cardSelectUnfinished"
    | "siteError"
    | "unexpectedPage";
  readonly detail?: string;
}

export interface ReadDeps {
  readonly transport: Transport;
  /** Scheme, host and port, no trailing slash: `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
}

export interface WriteDeps extends ReadDeps {
  readonly now: () => Date;
  /** Read another page before and after, to see that nothing but the edited set moved. */
  readonly crossCheck: boolean;
}

export interface EditorReading<S> {
  readonly state: S;
  readonly token: FormToken;
}

export interface InvalidTarget {
  readonly field: string;
}

/** A save's answer, as far as a write reads it. No token and no body travel in it. */
export interface SaveReading {
  readonly answer: AjaxAnswer["kind"];
  /** The result code, read strictly; null when there is none. */
  readonly code: number | null;
  /** Hiroba's words (`errmsg`, `err_message`): shown as plain text, never as HTML, never logged. */
  readonly message: string | null;
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
  /** Saved, but the game server was not told: counts only if the read-back shows the change. */
  readonly notSynced?: number;
}

export interface CrossCheck<C> {
  readonly read: (deps: ReadDeps) => Promise<Result<C, HirobaReadFailure>>;
  readonly same: (left: C, right: C) => boolean;
}

/** A kind of write. Type parameters: set, target, body, editor, cross-check value. */
export interface WriteSpec<S, T, B, E extends EditorReading<S>, C> {
  readonly readEditor: (deps: ReadDeps) => Promise<Result<E, HirobaReadFailure>>;
  readonly same: (left: S, right: S) => boolean;
  /** The target checked against the editor's own lists and made into a body, or refused. */
  readonly normalise: (editor: E, target: T) => Result<B, InvalidTarget>;
  /** The set the server leaves after storing `body`: its own rules, not the body's word. */
  readonly expectedAfter: (before: S, body: B) => S;
  readonly precheck?: (editor: E, body: B) => AjaxPost;
  /** GETs that put the body in Hiroba's session before the save, where the save posts only what
   * is held there; the editor they end on is the one the save is made from. */
  readonly stage?: (deps: ReadDeps, editor: E, body: B) => Promise<Result<E, HirobaReadFailure>>;
  readonly save: (editor: E, body: B) => AjaxPost;
  readonly codes: SaveCodes;
  /** The whole set, read fresh from the page that shows what is saved. */
  readonly readBack: (deps: ReadDeps) => Promise<Result<S, HirobaReadFailure>>;
  readonly cross?: CrossCheck<C>;
}

export type StopReason =
  | "precheckUnexpected"
  | "precheckRejected"
  | "precheckAtLogin"
  | "precheckEndpointMissing"
  | "precheckNoAnswer";

/** `unknown`: the read after the write did not arrive, which is never taken as unchanged. */
export type CrossVerdict = "off" | "unchanged" | "changed" | "unknown";

/** How a write ended. The set read back decides, not the site's answer; `save` only annotates. */
export type WriteOutcome<S> =
  /** 05:00–07:00 JST: no save was sent; at most the pre-check went out, which changes nothing. */
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
  | { readonly kind: "invalidTarget"; readonly field: string }
  | { readonly kind: "nothingToChange" }
  /** The pre-check asked for a confirmation this version does not give; nothing was saved. */
  | { readonly kind: "needsConfirmation" }
  /** The pre-check did not clear the write; nothing was saved. `code` is for a report. */
  | { readonly kind: "stoppedBeforeWrite"; readonly reason: StopReason; readonly code: string }
  /** Staging left Hiroba holding another set than the one wanted, so no save was sent. */
  | {
      readonly kind: "notStaged";
      readonly before: S;
      readonly staged: S;
      readonly expectedAfter: S;
    }
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
