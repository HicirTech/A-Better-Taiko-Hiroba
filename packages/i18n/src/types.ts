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
  /** The session stays on the device, across launches, until the user signs out. */
  "signOut.note": string;
  "profile.reading": string;
  "profile.readAgain": string;
  /** Param: {title}. */
  "profile.title": string;
  /** Param: {time}, already formatted for display. */
  "profile.fetchedAt": string;
  /** Shown in place of the title when the player wears none, a normal state. */
  "profile.noTitle": string;
  /** Param: {region}, as the page writes it. */
  "profile.region": string;
  /** A chip: my page shows a dan label. Which dan is not read yet; it exists only as an image. */
  "profile.danShown": string;
  /** Param: {dan}, the dan's name as Hiroba prints it, 五級 to 十段, read off my page's label. */
  "profile.dan": string;
  /** My page shows a dan label that did not read. Neutral: the rest of the page still read. */
  "profile.danUnreadable": string;
  /** Param: {code}, why the label did not read, such as dan=notPng; never page text or a URL. */
  "profile.danCode": string;
  "profile.favorites": string;
  /** Param: {title}, the 大好きな曲 as the page writes it. */
  "profile.favoriteSong": string;
  "profile.favoriteSongNone": string;
  /** Param: {count}, how many songs the お気に入り folder holds. */
  "profile.favoriteFolder": string;
  "profile.favoriteFolderEmpty": string;
  "crowns.heading": string;
  "crowns.silver": string;
  "crowns.gold": string;
  "crowns.donderful": string;
  /** Silver, gold and donderful added up: each crown is exclusive, and each one is a clear. */
  "crowns.clearedOrBetter": string;
  /** Gold and donderful added up. */
  "crowns.fullComboOrBetter": string;
  /**
   * Neutral on purpose: what the panel covers is an inference, checked on one account only. It
   * heads the crowns and the score ranks both, which the panel gives over the same charts.
   */
  "panel.heading": string;
  /** Param: {level}, the number on the panel's image, shown as data and never interpreted. */
  "panel.level": string;
  /** What the counts were checked against, and on how little. Site words kept as written. */
  "panel.footnote": string;
  /** The score-rank ladder, under the panel heading beside the crowns. */
  "panel.ranks": string;
  /** Param: {tier}, a tier's kanji as the rank icons show it: 粋, 雅 or 極. */
  "panel.tierTotal": string;
  /** Param: {tier}, the lowest tier the total counts (雅); its ranks and all above added up. */
  "panel.tierOrBetter": string;
  "medal.heading": string;
  /** Param: {count}, the medals collected this season. */
  "medal.count": string;
  /** The chip for a season whose set is done; the plate prints COMPLETE in place of the count. */
  "medal.complete": string;
  /** No plate on the page: a normal state, not a failure. */
  "medal.none": string;
  /** A plate of a shape this version does not know. The rest of the page still reads. */
  "medal.unrecognised": string;
  /** Param: {code}, which part of the plate did not read, such as medal=noCountNoComplete. */
  "medal.code": string;
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
