import type { Result } from "@abth/core";

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

/** What the interface shows of a profile. The taiko number is deliberately not part of it. */
export interface ProfileView {
  readonly nickname: string;
  readonly title: string;
  readonly crowns: { readonly silver: number; readonly gold: number; readonly donderful: number };
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
