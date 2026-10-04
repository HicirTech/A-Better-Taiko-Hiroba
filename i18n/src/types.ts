/** The locales the catalog carries, in the order a language picker lists them. */
export const LOCALES = ["en", "ja", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Each locale's name in its own language, so a reader of any language can find theirs. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  ja: "日本語",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

/** Every message key: a catalog missing one, or carrying another, is a type error. */
export interface Messages {
  "app.title": string;
  /** Param: {name}, the system's language in its own words (LOCALE_NAMES). */
  "language.system": string;
  "nav.overview": string;
  "nav.costume": string;
  "nav.nameTitle": string;
  "nav.favorites": string;
  "nav.settings": string;
  "nav.menu": string;
  "settings.language": string;
  "settings.account": string;
  /** Param: {name}, the nickname, as Hiroba writes it. */
  "settings.signedInAs": string;
  "settings.signedIn": string;
  "settings.signedOut": string;
  "settings.updates": string;
  /** Param: {version}, this build's version, such as 0.1.0. */
  "settings.version": string;
  "settings.songData": string;
  "settings.songDataSources": string;
  "signIn.intro": string;
  "signIn.action": string;
  "signIn.inProgress": string;
  "signIn.cancel": string;
  /** The in-app browser's own close button (Android). */
  "signIn.closeBrowser": string;
  "signIn.cancelled": string;
  "signIn.noSession": string;
  "signIn.unavailable": string;
  /** Param: {host}, where the sign-in was sent. */
  "signIn.refused": string;
  "signOut.action": string;
  "signOut.note": string;
  "update.check": string;
  "update.checking": string;
  "update.upToDate": string;
  "update.failed": string;
  "update.openReleases": string;
  "update.download": string;
  "update.later": string;
  "profile.reading": string;
  "profile.readAgain": string;
  /** Param: {title}. */
  "profile.title": string;
  /** Param: {time}, already formatted. */
  "profile.fetchedAt": string;
  "profile.noTitle": string;
  /** Param: {dan}, a `dan.N` text, N being the board number read off my page's label. */
  "profile.dan": string;
  "profile.danUnreadable": string;
  /** Param: {code}, why the label did not read, such as dan=notPng; never page text or a URL. */
  "profile.danCode": string;
  /** Board numbers as core numbers them: 1 (五級) to 15 (十段); 16 to 19 are 玄人, 名人, 超人, 達人. */
  // 日本語 is core's DAN_NAMES, which a test holds it to; the others are taiko.wiki's.
  "dan.1": string;
  "dan.2": string;
  "dan.3": string;
  "dan.4": string;
  "dan.5": string;
  "dan.6": string;
  "dan.7": string;
  "dan.8": string;
  "dan.9": string;
  "dan.10": string;
  "dan.11": string;
  "dan.12": string;
  "dan.13": string;
  "dan.14": string;
  "dan.15": string;
  "dan.16": string;
  "dan.17": string;
  "dan.18": string;
  "dan.19": string;
  "profile.myDonAlt": string;
  "profile.favorites": string;
  /** Param: {title}, the 大好きな曲 as the page writes it. */
  "profile.favoriteSong": string;
  "profile.favoriteSongNone": string;
  /** Param: {count}, how many songs the お気に入り folder holds. */
  "profile.favoriteFolder": string;
  "profile.favoriteFolderEmpty": string;
  "pictures.loading": string;
  "pictures.unavailable": string;
  /** Param: {code}, why the first did not come, such as titlePlate=notPng; never a URL. */
  "pictures.code": string;
  /** Score ranks by Hiroba's rank image number (best_score_rank_N, 2 to 8); no page names them. */
  // 日本語 is core's SCORE_RANK_NAMES, held by a test; English romanises colour and tier; pink is 粉.
  "scoreRank.2": string;
  "scoreRank.3": string;
  "scoreRank.4": string;
  "scoreRank.5": string;
  "scoreRank.6": string;
  "scoreRank.7": string;
  "scoreRank.8": string;
  "crowns.heading": string;
  /** Crowns by what they record (clear, full combo, Donderful Combo), as taiko.wiki words it. */
  "crowns.silver": string;
  "crowns.gold": string;
  "crowns.donderful": string;
  /** The score-rank block heading. Not 评级/評級: taiko.wiki uses those for the skill Rating. */
  "panel.ranks": string;
  /** Params: {count} and {total} (the sum of its block), both already formatted. */
  "panel.countOf": string;
  /** The same count, named. Adds {name}. */
  "panel.countTitle": string;
  "panel.art": string;
  /** The plate's own name is Hiroba's data, shown as written. */
  "medal.heading": string;
  /** Param: {count}, the medals collected this season. */
  "medal.count": string;
  "medal.complete": string;
  "medal.none": string;
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
  /** The name plate on the Overview: its accessible name, and what a long-press on it opens. */
  "plate.open": string;
  "plate.openByLongPress": string;
  "costume.open": string;
  "costume.openByLongPress": string;
  "costume.reading": string;
  "costume.preview.alt": string;
  "costume.preview.loading": string;
  "costume.preview.unavailable": string;
  /** Param: {code}, why it did not come, such as preview=notPng; never a URL or a query. */
  "costume.preview.code": string;
  "costume.tab.colours": string;
  "costume.tab.items": string;
  /** By the tab's name in Hiroba's guide: かお, どう, てあし, then the five slots from きぐるみ (mascot). */
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
  "costume.remove": string;
  /** Params: {part} (a costume.part text) and {id}. */
  "costume.item.label": string;
  /** Param: {count}, how many did not come. */
  "costume.thumbnails.unavailable": string;
  /** Param: {code}, why the first of them did not come, such as costumeItem=notPng; never a URL. */
  "costume.thumbnails.code": string;
  "costume.kigurumiWarning": string;
  "costume.reset": string;
  "costume.save": string;
  "costume.saving": string;
  "costume.history": string;
  "costume.history.title": string;
  "costume.history.close": string;
  /** Marks the entry that is the set Hiroba shows now. */
  "costume.history.wornNow": string;
  /** Param: {position}, 1 for the newest. An entry's name as a button. */
  "costume.history.entry": string;
  /** Param: {position}. As costume.history.entry, for the entry worn now. */
  "costume.history.entryWorn": string;
  /** Also the title row's label in a write's comparison. */
  "title.heading": string;
  "title.reading": string;
  "title.open": string;
  "title.close": string;
  "title.clear": string;
  /** Param: {count}, how many titles the account may choose from. */
  "title.noMatch": string;
  "title.none": string;
  "title.current": string;
  /** Param: {count}, how many titles of the list have the worn title's name. */
  "title.shared": string;
  "title.notListed": string;
  "name.heading": string;
  /** Params: {count}, how many characters it holds, and {max}. */
  "name.counter": string;
  /** Hiroba's own warning above the field, as the site writes it, in every language. */
  "name.siteWarning": string;
  "name.same": string;
  /** Quotes Hiroba's sentence that nicknames cannot be changed now, as the site writes it. */
  "name.closed": string;
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
  "write.crossChanged": string;
  "write.outcomeUnknown": string;
  "write.sessionGone": string;
  "write.sessionGoneAfterSave": string;
  "write.changedSincePreview": string;
  /** Param: {field}, which value of the set was refused, as a costume.part text. */
  "write.invalidTarget": string;
  "write.nothingToChange": string;
  "write.maintenance": string;
  /** Carries the site's own confirmation text (mydon.js); this version does not answer it. */
  "write.needsConfirmation": string;
  "write.stoppedBeforeWrite": string;
  "write.notStaged": string;
  "write.interrupted": string;
  "write.busy": string;
  /** Param: {code}, report codes: where an answer ended, status, type and size; never page text. */
  "write.code": string;
  "write.before": string;
  "write.planned": string;
  "write.now": string;
  /** A title's write: each key has the costume's key, without "title.", as its base. */
  "write.title.unchanged": string;
  "write.title.diverged": string;
  "write.title.crossChanged": string;
  "write.title.changedSincePreview": string;
  "write.title.nothingToChange": string;
  /** Carries the site's own confirmation text (check_ip_title); this version does not answer it. */
  "write.title.needsConfirmation": string;
  /** Hiroba's codes for a refused title, which come with no message of their own. */
  "write.title.refused1": string;
  "write.title.refused5": string;
  "write.title.refused6": string;
  /** A rename's write, like the costume's; the title read around it uses write.cross*. */
  "write.name.unchanged": string;
  "write.name.diverged": string;
  "write.name.changedSincePreview": string;
  "write.name.nothingToChange": string;
  /** Hiroba's code for a rename it could not carry out, which comes with no message of its own. */
  "write.name.refused2": string;
  /** The words of {field} in "write.invalidTarget": a phrase, with no capital and no full stop. */
  "write.invalid.titleNotOwned": string;
  "write.invalid.nameEmpty": string;
  "write.invalid.nameEdge": string;
  "write.invalid.nameTooLong": string;
  "write.invalid.nameControl": string;
  "write.invalid.nameClosed": string;
  /** The genres as taiko.wiki's own locale files name them. */
  "genre.pops": string;
  "genre.anime": string;
  "genre.kids": string;
  "genre.vocaloid": string;
  "genre.game": string;
  "genre.namco": string;
  "genre.variety": string;
  "genre.classic": string;
  /** The charts as the game's terms name them. */
  "difficulty.easy": string;
  "difficulty.normal": string;
  "difficulty.hard": string;
  "difficulty.oni": string;
  "difficulty.ura": string;
  /** Params: {difficulty} (a difficulty.* text) and {level}, its stars. A level badge's name. */
  "song.level": string;
  /** A folder write: each key has the costume's key, without "folder.", as its base. */
  "write.folder.unchanged": string;
  "write.folder.diverged": string;
  "write.folder.changedSincePreview": string;
  "write.folder.nothingToChange": string;
  /** A 大好きな曲 write, worded like the folder's. */
  "write.favoriteSong.unchanged": string;
  "write.favoriteSong.diverged": string;
  "write.favoriteSong.changedSincePreview": string;
  "write.favoriteSong.nothingToChange": string;
  /** Hiroba's codes for a refused 大好きな曲, which come with no message of their own. */
  "write.favoriteSong.refused1": string;
  "write.favoriteSong.refused2": string;
  /** Param: {number}, a slot's place in the folder, from 1. */
  "favorites.slot": string;
  "favorites.slot.empty": string;
  "favorites.song.heading": string;
  "favorites.song.none": string;
  "picker.title.single": string;
  "picker.title.multi": string;
  "picker.search": string;
  /** The search field's helper: what it looks in. */
  "picker.searchHint": string;
  "picker.genres": string;
  "picker.none": string;
  "picker.loading": string;
  "picker.failed": string;
  /** Param: {code}, why the song list did not come, such as unreachable; never a URL. */
  "picker.code": string;
  "picker.retry": string;
  /** Param: {max}, how many songs a set holds. */
  "picker.limit": string;
  "picker.done": string;
  "picker.close": string;
}

export type MessageKey = keyof Messages;
