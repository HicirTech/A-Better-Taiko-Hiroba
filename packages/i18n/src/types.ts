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
  /** The identity card's button that opens the costume editor. */
  "costume.open": string;
  /**
   * Under that button, disabled, when this run may not change the costume: why. True on every shell
   * while no kind is verified; say it again once one is, since Android enables none either way.
   */
  "costume.notOpen": string;
  /** The editor's heading: the site's own word, きせかえ. */
  "costume.title": string;
  "costume.reading": string;
  /**
   * The picture at the top of the editor, Hiroba's own drawing of the set as picked, as its
   * 今のきせかえセット box shows one: its alternative text.
   */
  "costume.preview.alt": string;
  /** Beside the last picture while the one for the latest pick is on its way. */
  "costume.preview.loading": string;
  /** The picture for the latest pick did not come. Neutral: the editor works without it. */
  "costume.preview.unavailable": string;
  /** Param: {code}, why it did not come, such as preview=notPng; never a URL or a query. */
  "costume.preview.code": string;
  /** The top tabs, in the site's words: いろ (colours) and きせかえ (items). */
  "costume.tab.colours": string;
  "costume.tab.items": string;
  /** Each value of the set, by the site's own tab label: かお, どう, てあし, then the five slots. */
  "costume.part.colorFace": string;
  "costume.part.colorBody": string;
  "costume.part.colorLimb": string;
  "costume.part.costume1": string;
  "costume.part.costume2": string;
  "costume.part.costume3": string;
  "costume.part.costume4": string;
  "costume.part.costume5": string;
  /** Param: {id}. An item or a colour by its number: the page gives no names. */
  "costume.id": string;
  /** Empties a slot: the site's own button, はずす. */
  "costume.remove": string;
  /**
   * An item's tile in the thumbnail grid, for a screen reader: its slot and its number. Params:
   * {part} (a costume.part text) and {id}.
   */
  "costume.item.label": string;
  /**
   * Under the thumbnail grid, when some of its pictures did not come. Neutral: each such tile shows
   * its number instead, and the editor works as before. Param: {count}, how many did not come.
   */
  "costume.thumbnails.unavailable": string;
  /** Param: {code}, why the first of them did not come, such as costumeItem=notPng; never a URL. */
  "costume.thumbnails.code": string;
  /** The arrows above and below the thumbnail grid, as Hiroba's ▲ and ▼, for a screen reader. */
  "costume.scroll.up": string;
  "costume.scroll.down": string;
  /** Shown while a きぐるみ is picked: the four pieces come off with it. */
  "costume.kigurumiWarning": string;
  "costume.changesHeading": string;
  /** Params: {part} (a costume.part text), {from} and {to} (a costume.id text, or costume.remove). */
  "costume.change": string;
  "costume.noChanges": string;
  "costume.review": string;
  "costume.back": string;
  "costume.save": string;
  "costume.close": string;
  "costume.confirmIntro": string;
  /**
   * The extra confirmation a kind of write needs until its first real write from the app has been
   * made and recorded.
   */
  "costume.firstWrite": string;
  /** Said with the extra confirmation: while unverified, a write also reads the title twice. */
  "costume.crossCheck": string;
  "costume.saving": string;
  /** The card's way back from the last costume write, while it is still offered. */
  "costume.undoLast": string;
  /** Param: {time}, already formatted: when the write the undo would reverse was made. */
  "costume.undoWhen": string;
  "costume.undoing": string;
  /** A write that read back as planned. */
  "write.applied": string;
  /** An undo that read back as planned. */
  "write.undone": string;
  "write.undo": string;
  /** Param: {code}. The set moved as planned, and Hiroba's answer said otherwise. */
  "write.siteNote": string;
  /** Saved as planned, and the page read to check nothing else moved did not come back. */
  "write.crossUnknown": string;
  "write.appliedNotSynced": string;
  "write.notApplied.unchanged": string;
  /** Param: {code}, Hiroba's code; its own message follows under write.siteMessage. */
  "write.notApplied.refused": string;
  "write.notApplied.stale": string;
  "write.notApplied.siteMaintenance": string;
  "write.notApplied.failed": string;
  "write.notApplied.noAnswer": string;
  "write.notApplied.rejected": string;
  "write.notApplied.endedAtLogin": string;
  "write.notApplied.endpointMissing": string;
  "write.notApplied.unexpected": string;
  /** Param: {message}, Hiroba's own words for a write, shown as plain text. */
  "write.siteMessage": string;
  "write.diverged": string;
  /** The page read before and after a write moved during it. */
  "write.crossChanged": string;
  "write.outcomeUnknown": string;
  "write.sessionGone": string;
  "write.sessionGoneAfterSave": string;
  "write.changedSincePreview": string;
  /** An undo stopped because the set moved since the change it would reverse. */
  "write.undoStale": string;
  /** Param: {field}, which value of the set was refused, as a costume.part text. */
  "write.invalidTarget": string;
  "write.nothingToChange": string;
  "write.maintenance": string;
  "write.undoNotSaved": string;
  /** Carries the site's own confirmation text (mydon.js), which this version does not answer. */
  "write.needsConfirmation": string;
  "write.stoppedBeforeWrite": string;
  "write.notEnabled": string;
  "write.nothingToUndo": string;
  /** The app stopped a write before judging it: whether it saved is not known. */
  "write.interrupted": string;
  /** A write asked for while another was still being sent: this one sent nothing. */
  "write.busy": string;
  /** Param: {code}, report codes: where an answer ended, status, type and size; never page text. */
  "write.code": string;
  /** The comparison under a write that did not go as planned. */
  "write.before": string;
  "write.planned": string;
  "write.now": string;
}

export type MessageKey = keyof Messages;
