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
