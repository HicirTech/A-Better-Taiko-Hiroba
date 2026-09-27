import type { MedalProgress, Result, ScoreRank } from "@abth/core";

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
 * What the interface shows of a profile: plain data that survives JSON. The taiko number is
 * deliberately not part of it, and neither is any URL — the dan label's carries the taiko number,
 * so only whether there is one crosses.
 */
export interface ProfileView {
  readonly nickname: string;
  /** "" when the player wears no title, a normal state. */
  readonly title: string;
  /** Null when the page gives none, or 未設定. */
  readonly region: string | null;
  /** Whether my page shows a dan label. Which dan it is exists only as an image, not read yet. */
  readonly hasDan: boolean;
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
 * Everything the interface can ask of the platform, and everything that crosses from the platform
 * layer into the interface. No cookie, no URL and no page text is part of it.
 */
export interface HirobaSessionPort {
  /** Whether this device holds a session from an earlier sign-in. Asks Hiroba nothing. */
  isSignedIn(): Promise<boolean>;
  signIn(): Promise<SignInOutcome>;
  /** Closes an open sign-in; its `signIn()` then resolves as cancelled. Harmless when none is open. */
  cancelSignIn(): Promise<void>;
  /** One request to Hiroba per call. Never retries by itself. */
  readProfile(): Promise<Result<ProfileView, ReadFailure>>;
  /** Forgets the session on this device. Hiroba is not told. */
  signOut(): Promise<void>;
}
