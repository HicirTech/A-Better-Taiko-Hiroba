import type { Result } from "@abth/core";

export type SignInOutcome =
  | { readonly kind: "signedIn" }
  /** The user closed the sign-in view, or pressed cancel, before landing. */
  | { readonly kind: "cancelled" }
  /** Landed, but no session cookie was there to take. */
  | { readonly kind: "noSession" }
  /** The platform could not open a sign-in view at all. */
  | { readonly kind: "unavailable" };

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
}

/**
 * Everything the interface can ask of the platform, and everything that crosses from the platform
 * layer into the interface. No cookie, no URL and no page text is part of it.
 */
export interface HirobaSessionPort {
  signIn(): Promise<SignInOutcome>;
  /** Closes an open sign-in; its `signIn()` then resolves as cancelled. Harmless when none is open. */
  cancelSignIn(): Promise<void>;
  /** One request to Hiroba per call. Never retries by itself. */
  readProfile(): Promise<Result<ProfileView, ReadFailure>>;
  /** Forgets the session on this device. Hiroba is not told. */
  signOut(): Promise<void>;
}
