/** The locales the catalog carries, in the order a language picker lists them. */
export const LOCALES = ["en", "ja", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Each locale's name in its own language, as a language picker lists it: someone who cannot read the
 * language the app is in can still find their own.
 */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  ja: "日本語",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

/**
 * Every message key, and the one place that says which keys exist: a catalog missing a key, or
 * carrying one this interface does not name, is a type error.
 *
 * Keys are language-neutral and grouped by the screen or concept that shows them. A `{name}` in a
 * message is a parameter the caller supplies.
 */
export interface Messages {
  "app.title": string;
  /**
   * Settings' first language choice, to follow the system's language, now and at each launch.
   * Param: {name}, the language the system gives, in its own words (LOCALE_NAMES).
   */
  "language.system": string;
  /**
   * The window's pages, as its navigation names them: the side panel on a wide window, the menu on
   * a narrow one. Each also names its page for screen readers, as its heading.
   */
  "nav.overview": string;
  /** The page of the costume editor. 日本語 names it with the site's own word, きせかえ. */
  "nav.costume": string;
  /** The page of the title and the Donder name. */
  "nav.nameTitle": string;
  /** The page of the 大好きな曲 and the お気に入り folder. */
  "nav.favorites": string;
  "nav.settings": string;
  /** The narrow window's menu button, which opens the pages: its name for screen readers. */
  "nav.menu": string;
  /** The heading of Settings' language section. */
  "settings.language": string;
  /** The heading of Settings' account section: signing out, and what staying signed in keeps. */
  "settings.account": string;
  /** Who is signed in, in the account section. Param: {name}, the nickname, as Hiroba writes it. */
  "settings.signedInAs": string;
  /** The same while a session is open but no read has given the nickname yet. */
  "settings.signedIn": string;
  /** The same while no session is open. */
  "settings.signedOut": string;
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
  /**
   * The session stays on the device, across launches, until the user signs out; Hiroba's pictures
   * stay after that too.
   */
  "signOut.note": string;
  "profile.reading": string;
  "profile.readAgain": string;
  /** Param: {title}. */
  "profile.title": string;
  /** Param: {time}, already formatted for display. */
  "profile.fetchedAt": string;
  /** Shown in place of the title when the player wears none, a normal state. */
  "profile.noTitle": string;
  /** Param: {dan}, the dan's name as Hiroba prints it, 五級 to 十段, read off my page's label. */
  "profile.dan": string;
  /** My page shows a dan label that did not read. Neutral: the rest of the page still read. */
  "profile.danUnreadable": string;
  /** Param: {code}, why the label did not read, such as dan=notPng; never page text or a URL. */
  "profile.danCode": string;
  /**
   * The player's マイどん on the identity card, Hiroba's own picture of it in the costume it wears:
   * its alternative text.
   */
  "profile.myDonAlt": string;
  "profile.favorites": string;
  /** Param: {title}, the 大好きな曲 as the page writes it. */
  "profile.favoriteSong": string;
  "profile.favoriteSongNone": string;
  /** Param: {count}, how many songs the お気に入り folder holds. */
  "profile.favoriteFolder": string;
  "profile.favoriteFolderEmpty": string;
  /**
   * Beside one of Hiroba's pictures on the profile, such as the title plate, while it is on its
   * way: the name of a small spinner. The card stands, drawn plainly, until it comes.
   */
  "pictures.loading": string;
  /**
   * Under the identity card when one or more of Hiroba's pictures did not come. Neutral: the card
   * is drawn plainly in their place, and reads as well without them.
   */
  "pictures.unavailable": string;
  /** Param: {code}, why the first did not come, such as titlePlate=notPng; never a URL. */
  "pictures.code": string;
  /**
   * The seven score ranks the panel counts, by the number of Hiroba's rank image
   * (best_score_rank_N, 2 to 8). No page prints a rank's name: each image shows its kanji. 日本語
   * writes them as core's SCORE_RANK_NAMES does, which a test holds it to. English gives each its
   * colour and its tier, romanised (Iki, Miyabi, Kiwami); the Chinese ones are the same kanji in
   * the language's own spelling, with pink as 粉.
   */
  "scoreRank.2": string;
  "scoreRank.3": string;
  "scoreRank.4": string;
  "scoreRank.5": string;
  "scoreRank.6": string;
  "scoreRank.7": string;
  "scoreRank.8": string;
  /** The heading of the panel's crown block, which follows the score ranks. */
  "crowns.heading": string;
  "crowns.silver": string;
  "crowns.gold": string;
  "crowns.donderful": string;
  /**
   * Under both of the panel's blocks: what the counts were checked against, and on how little.
   * Site words kept as written.
   */
  "panel.footnote": string;
  /** The heading of the panel's score-rank block, the first of its two. */
  "panel.ranks": string;
  /**
   * A count on the panel, secondary to its share: read out after the percent. Params: {count}, and
   * {total}, the sum of its block, both already formatted.
   */
  "panel.countOf": string;
  /** The same count, named, as the title of its legend item and its part of the bar. Adds {name}. */
  "panel.countTitle": string;
  /**
   * Names, for screen readers, Hiroba's own score panel at the top of the Overview: its art with the
   * counts written over it. It has no heading to see, as on Hiroba.
   */
  "panel.art": string;
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
  /** The name of the My Don portrait, a button that opens the Costume page, and its tooltip. */
  "costume.open": string;
  /**
   * The same portrait's description on a touch-first screen, where a finger opens the Costume page
   * by a long-press and a tap does nothing: say to long-press.
   */
  "costume.openByLongPress": string;
  /** The Costume page while the editor is read from Hiroba, the first time or again. */
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
  /** Puts the draft back to the set as the editor last read it, as the site's own リセット does. */
  "costume.reset": string;
  "costume.review": string;
  "costume.back": string;
  "costume.save": string;
  "costume.confirmIntro": string;
  "costume.saving": string;
  /** The Costume page's way back from the last costume write, while it is still offered. */
  "costume.undoLast": string;
  /** Param: {time}, already formatted: when the write the undo would reverse was made. */
  "costume.undoWhen": string;
  "costume.undoing": string;
  /** The Title section's heading, and the title's name in a list of changes (costume.change's {part}). */
  "title.heading": string;
  /** The Title section while the list of owned titles is read from Hiroba, the first time or again. */
  "title.reading": string;
  /** The title picker's label. */
  "title.pick": string;
  /** Under the picker. Param: {count}, how many titles the account may choose from. */
  "title.count": string;
  /** The picker's list when what was typed matches no title. */
  "title.noMatch": string;
  /** Hiroba's list holds no title to choose from. */
  "title.none": string;
  /** The chip on the option that is the title worn now. */
  "title.current": string;
  /**
   * The worn title's name is several titles' of the list, so the app cannot tell which is worn.
   * Param: {count}, how many titles of the list have the name.
   */
  "title.shared": string;
  /** The worn title's name is in no title of the list: it may be one built from parts. */
  "title.notListed": string;
  /** Reads the list of titles again, after a read of it failed. */
  "title.reload": string;
  /** The Title section's way back from the last title change, while it is still offered. */
  "title.undoLast": string;
  /** Under the undo button. Param: {title}, the previous title's name, as Hiroba writes it. */
  "title.undoBack": string;
  /** Why the undo is shut: the previous title's name is in no title of today's list. */
  "title.undoUnresolved": string;
  /** Why the undo is shut: the previous title's name is several titles' of today's list. */
  "title.undoAmbiguous": string;
  /** Why the undo is shut: there was no title before, and a title cannot be taken off here. */
  "title.undoNoTitle": string;
  /** The Name section's heading. 日本語 names it with the site's own word, ドンだーネーム. */
  "name.heading": string;
  /** The name field's label. */
  "name.field": string;
  /** Under the name field. Params: {count}, how many characters it holds, and {max}. */
  "name.counter": string;
  /** Hiroba's warning above its own name field, as the site writes it, in every language. */
  "name.siteWarning": string;
  /**
   * What Hiroba's help page says a name may be, quoting its sentence as the site writes it, and
   * that other names have been seen.
   */
  "name.faqRule": string;
  /** Advice: the name has a character outside the help page's set, or is past its five. */
  "name.outsideFaq": string;
  /** Advice: the name is wider than the ten half-width characters the form seems to take. */
  "name.wide": string;
  /** The name typed is the name worn. */
  "name.same": string;
  /** Hiroba says names cannot be changed now, quoting its sentence as the site writes it. */
  "name.closed": string;
  /** My page did not say whether Hiroba takes a name change now: the field stays open. */
  "name.unknownState": string;
  /** In the review: Hiroba may not let the name be changed back right away. */
  "name.mayNotRevert": string;
  /** The Name section's way back from the last name change, while it is still offered. */
  "name.undoLast": string;
  /** Under the undo button. Param: {name}, the previous name, as Hiroba writes it. */
  "name.undoBack": string;
  /** Under the undo button: Hiroba may refuse a change back as it may refuse any change. */
  "name.undoMayFail": string;
  /** A write that read back as planned. */
  "write.applied": string;
  /** An undo that read back as planned. */
  "write.undone": string;
  /** Param: {code}. The set moved as planned, and Hiroba's answer said otherwise. */
  "write.siteNote": string;
  /** Saved as planned, and the page read to check nothing else moved did not come back. */
  "write.crossUnknown": string;
  "write.appliedNotSynced": string;
  "write.notApplied.unchanged": string;
  /** Param: {code}, Hiroba's code; its own message follows under write.siteMessage. */
  "write.notApplied.refused": string;
  /** Says to use the Costume page's Read again, and retry. */
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
  /** Says to use the Costume page's Read again before trying again. */
  "write.outcomeUnknown": string;
  "write.sessionGone": string;
  "write.sessionGoneAfterSave": string;
  /** The costume moved since the editor last read it; the page now shows it as it is. */
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
  "write.nothingToUndo": string;
  /**
   * The app stopped a write before judging it: whether it saved is not known. Says to use the
   * Costume page's Read again, and look.
   */
  "write.interrupted": string;
  /** A write asked for while another was still being sent: this one sent nothing. */
  "write.busy": string;
  /** Param: {code}, report codes: where an answer ended, status, type and size; never page text. */
  "write.code": string;
  /** The comparison under a write that did not go as planned. */
  "write.before": string;
  "write.planned": string;
  "write.now": string;
  /**
   * A title's write, in the words of "write.*" for the costume's: the title is what is saved,
   * undone, compared and judged here. Each has the costume's key, the one without "title." as
   * its base.
   */
  "write.title.applied": string;
  "write.title.undone": string;
  "write.title.unchanged": string;
  "write.title.diverged": string;
  /** The costume, which is read before and after a title write, moved during it. */
  "write.title.crossChanged": string;
  /** Saved as planned, and the costume read to check nothing else moved did not come back. */
  "write.title.crossUnknown": string;
  "write.title.changedSincePreview": string;
  "write.title.undoStale": string;
  "write.title.nothingToChange": string;
  /** Carries the site's own confirmation text (check_ip_title), which this version does not answer. */
  "write.title.needsConfirmation": string;
  /** Hiroba's codes for a refused title, which come with no message of their own. */
  "write.title.refused1": string;
  "write.title.refused5": string;
  "write.title.refused6": string;
  /** A rename's write, as the costume's "write.*" are. The title, read before and after, is the costume's "write.cross*". */
  "write.name.applied": string;
  "write.name.undone": string;
  "write.name.unchanged": string;
  "write.name.diverged": string;
  "write.name.changedSincePreview": string;
  "write.name.undoStale": string;
  "write.name.nothingToChange": string;
  /** Hiroba's code for a rename it could not carry out, which comes with no message of its own. */
  "write.name.refused2": string;
  /**
   * The words of {field} in "write.invalidTarget", for a title or a name this app refused before
   * sending it. A phrase, with no capital and no full stop of its own.
   */
  "write.invalid.titleNotOwned": string;
  "write.invalid.titleUnresolved": string;
  "write.invalid.titleAmbiguous": string;
  "write.invalid.nameEmpty": string;
  "write.invalid.nameEdge": string;
  "write.invalid.nameTooLong": string;
  "write.invalid.nameControl": string;
  "write.invalid.nameClosed": string;
}

export type MessageKey = keyof Messages;
