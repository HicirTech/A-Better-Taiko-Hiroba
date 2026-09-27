/** The locales the catalog carries. English only for now; ja and zh join here, not elsewhere. */
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Every message key, and the one place that says which keys exist: a catalog missing a key, or
 * carrying one this interface does not name, is a type error.
 *
 * Keys are language-neutral and grouped by the screen or concept that shows them. A `{name}` in a
 * message is a parameter the caller supplies.
 */
export interface Messages {
  "app.title": string;
  "signIn.intro": string;
  "signIn.action": string;
  "signIn.inProgress": string;
  "signIn.cancel": string;
  /** The in-app browser's own close button (Android). */
  "signIn.closeBrowser": string;
  "signIn.cancelled": string;
  "signIn.noSession": string;
  "signIn.unavailable": string;
  /** Param: {host}, the host name the sign-in was sent to. */
  "signIn.refused": string;
  "signOut.action": string;
  /** What the desktop keeps: memory only, gone when the app closes. */
  "signOut.note.desktop": string;
  /** What Android keeps: the WebView's cookie store, on disk until sign-out or the next launch. */
  "signOut.note.android": string;
  "profile.reading": string;
  "profile.readAgain": string;
  /** Param: {title}. */
  "profile.title": string;
  /** Params: {silver}, {gold}, {donderful}. */
  "profile.crowns": string;
  /** Param: {time}, already formatted for display. */
  "profile.fetchedAt": string;
  "failure.notSignedIn": string;
  "failure.loggedOut": string;
  "failure.cardSelectUnfinished": string;
  "failure.unreachable": string;
  "failure.timedOut": string;
  "failure.cancelled": string;
  "failure.siteError": string;
  "failure.unexpectedPage": string;
  /** Param: {detail}, codes for a report (path, status, parser verdict); never page text. */
  "failure.detail": string;
  "platform.unsupported": string;
}

export type MessageKey = keyof Messages;
