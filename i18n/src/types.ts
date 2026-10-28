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
  "nav.scores": string;
  "nav.rating": string;
  "nav.knowYourself": string;
  "nav.costume": string;
  "nav.nameTitle": string;
  "nav.favorites": string;
  "nav.settings": string;
  "nav.menu": string;
  "nav.pipelines": string;
  "pipelines.io": string;
  "pipelines.external": string;
  "pipelines.now": string;
  "pipelines.ended": string;
  "pipelines.waiting": string;
  "pipelines.more": string;
  "pipelines.less": string;
  "pipelines.pictures": string;
  "pipelines.history": string;
  "pipelines.scores": string;
  "pipelines.read": string;
  "pipelines.exclusive": string;
  "pipelines.write": string;
  "pipelines.succeeded": string;
  "pipelines.failed": string;
  "pipelines.stopped": string;
  "pipelines.running": string;
  "pipelines.queued": string;
  "pipelines.requests": string;
  "pipelines.took": string;
  "pipelines.startedAt": string;
  "pipelines.onRequest": string;
  "pipelines.onRequestOf": string;
  "pipelines.failedAt": string;
  "pipelines.stoppedAfter": string;
  "pipelines.noRequest": string;
  "pipelines.code": string;
  "pipelines.op.readProfile": string;
  "pipelines.op.refreshHiroba": string;
  /** Param: {page}. A page of the recent plays walk, in the play history pipeline. */
  "pipelines.op.recentPlaysPage": string;
  /** Param: {genre}, its name. A genre's score list, in Hiroba's IO pipeline. */
  "pipelines.op.scoreList": string;
  /** Params: {song}, its number, and {difficulty}. A chart's details, in the scores pipeline. */
  "pipelines.op.scoreDetail": string;
  "pipelines.op.openCostumeEditor": string;
  "pipelines.op.openTitleEditor": string;
  "pipelines.op.previewCostume": string;
  "pipelines.op.changeCostume": string;
  "pipelines.op.changeTitle": string;
  "pipelines.op.changeName": string;
  "pipelines.op.openFavorites": string;
  "pipelines.op.changeFolder": string;
  "pipelines.op.changeFavoriteSong": string;
  "pipelines.op.readSongPicker": string;
  "pipelines.op.readUpdateFeed": string;
  "pipelines.op.readSongCatalogue": string;
  "pipelines.op.readChineseNames": string;
  "pipelines.op.readRatingData": string;
  "pipelines.op.picture": string;
  "pipelines.op.chartPicture": string;
  "pipelines.op.chartDensity": string;
  "pipelines.op.chartTja": string;
  "pipelines.picture.myDon": string;
  "pipelines.picture.titlePlate": string;
  "pipelines.picture.medalPlate": string;
  "pipelines.picture.scorePanel": string;
  "pipelines.picture.rankIcon": string;
  "pipelines.picture.crownIcon": string;
  "pipelines.picture.courseIcon": string;
  "pipelines.picture.optionIcon": string;
  "pipelines.picture.costumeItem": string;
  /** Param: {page}. Under a walk's failure: the page whose request failed. */
  "history.failedPage": string;
  /** 良, 可, 不可, 連打 and the longest combo: a row's hit counts, in taiko.wiki's words. */
  "history.good": string;
  "history.ok": string;
  "history.bad": string;
  "history.roll": string;
  "history.combo": string;
  /** Param: {speed}, the speed option's multiplier: its icon's name, shown when it is not 1. */
  "history.speed": string;
  /** The play options ドロン, あべこべ, きまぐれ, でたらめ and サポート譜面: their icons' names. */
  "history.doron": string;
  "history.abekobe": string;
  "history.kimagure": string;
  "history.detarame": string;
  "history.support": string;
  "history.addToSet": string;
  "history.setHolds": string;
  "history.setFull": string;
  /** Param: {page}. While a read of scores walks recent plays. */
  "scores.readingPlays": string;
  /** Params: {done} and {total}, the lists or the charts read so far, and how many in all. */
  "scores.readingLists": string;
  "scores.readingCharts": string;
  /** Param: {song}, Hiroba's title. While one song's scores are read again. */
  "scores.readingSong": string;
  /** Param: {genre}. Under a read's failure: the list whose request failed. */
  "scores.failedList": string;
  /** Params: {song} and {difficulty}. Under a read's failure: the chart whose request failed. */
  "scores.failedChart": string;
  /** On the scores page with nothing kept yet: how to read them, on a touch screen or not. */
  "scores.emptyPull": string;
  "scores.emptyReadAgain": string;
  /** After a read of all scores that found no chart played since the last: why nothing changed. */
  "scores.nothingNew": string;
  /** Param: {count}, charts played or stopped at but not read yet. */
  "scores.unread": string;
  "rating.figure.rating": string;
  "rating.figure.power": string;
  "rating.figure.stamina": string;
  "rating.figure.speed": string;
  "rating.figure.burst": string;
  "rating.figure.accuracy": string;
  "rating.figure.rhythm": string;
  "rating.figure.complex": string;
  "rating.best": string;
  "rating.next": string;
  /** Param: {value}, the chart's constant in its system. */
  "rating.constant": string;
  /** Param: {value}, the chart's accuracy as a percentage. */
  "rating.accuracy": string;
  "rating.readingData": string;
  "rating.dataFailed": string;
  "rating.noneRated": string;
  "rating.noneRatedV2": string;
  /** Rating's switch between the two versions, as screen readers name it. */
  "rating.switch": string;
  "rating.system.ourtaikoV1": string;
  "rating.system.ourtaikoV2": string;
  "rating.systemShort.ourtaikoV1": string;
  "rating.systemShort.ourtaikoV2": string;
  /** The Overview's and Rating's button that makes the page a picture to share. */
  "snapshot.button": string;
  /** The picture's ways out, as its menu lists them: the system's share sheet, a copy, a file. */
  "snapshot.share": string;
  "snapshot.copy": string;
  "snapshot.save": string;
  /** The button's name while the picture is made. */
  "snapshot.making": string;
  "snapshot.copied": string;
  "snapshot.saved": string;
  "snapshot.failed": string;
  /** A song's action: read its charts again. */
  "scores.readSong": string;
  /** Asks before a read of every score, after a long hold on the page's read again. */
  "scores.readEvery.title": string;
  /** Param: {count}, the played charts, as the locale writes a count. */
  "scores.readEvery.body": string;
  "scores.readEvery.cancel": string;
  "scores.readEvery.confirm": string;
  /** The sort chip's name, and its menu's. */
  "scores.sort": string;
  /** The sorts: by name, the order with none chosen, then the others. */
  "scores.sort.name": string;
  "scores.sort.score": string;
  "scores.sort.rank": string;
  "scores.sort.crown": string;
  "scores.sort.recent": string;
  /** With charts kept, but none the search and the filters leave. */
  "scores.noMatch": string;
  /** A chart's details: Hiroba's Japan ranking, and its place there. */
  "scores.ranking": string;
  /** Param: {place}, the place, as the locale writes a count. */
  "scores.place": string;
  "scores.noPlace": string;
  /** The four play counts: also the sorts by plays, full combos and clears. */
  "scores.plays": string;
  "scores.clears": string;
  "scores.fullCombos": string;
  "scores.donderfuls": string;
  /** 区間毎詳細成績, and one section of it. Param: {number}, from 1. */
  "scores.sections": string;
  "scores.section": string;
  /** Param: {time}, when the chart's details were read. */
  "scores.readAt": string;
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
  "settings.chartSource": string;
  "settings.chartSourceHint": string;
  "settings.chartSource.cdn": string;
  "settings.chartSource.tja": string;
  "settings.chartSource.wiki": string;
  "settings.taikoWiki": string;
  "settings.taikoWikiGives": string;
  "settings.chineseWiki": string;
  "settings.chineseWikiGives": string;
  "settings.chartWiki": string;
  "settings.chartWikiGives": string;
  "settings.ourTaiko": string;
  "settings.ourTaikoGives": string;
  "settings.fumenDb": string;
  "settings.fumenDbGives": string;
  "settings.abthCdn": string;
  "settings.abthCdnGives": string;
  "settings.ese": string;
  "settings.eseGives": string;
  "settings.tjaRenderer": string;
  "settings.tjaRendererGives": string;
  "settings.github": string;
  "settings.githubGives": string;
  "settings.songLevels": string;
  "settings.shownDifficulty": string;
  "settings.shownDifficultyHint": string;
  "settings.scores": string;
  "settings.startingSort": string;
  "settings.startingSortHint": string;
  "settings.rating": string;
  "settings.startingRating": string;
  "settings.startingRatingHint": string;
  "settings.appearance": string;
  "settings.theme": string;
  "settings.theme.default": string;
  "settings.theme.hiroba": string;
  "settings.mode": string;
  "settings.mode.system": string;
  "settings.mode.light": string;
  "settings.mode.dark": string;
  "signIn.intro": string;
  "signIn.action": string;
  "signIn.inProgress": string;
  "signIn.cancel": string;
  /** The in-app browser's own close button (Android). */
  "signIn.closeBrowser": string;
  "signIn.cancelled": string;
  "signIn.noSession": string;
  "signIn.unavailable": string;
  /** Param: {host}, where the sign-in was sent, on a page that is not https. */
  "signIn.refused": string;
  /** Param: {host}, a service that refuses to sign in inside an app; the system's browser opens. */
  "signIn.refuser": string;
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
  "pictures.loading": string;
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
  "know.ladder": string;
  "know.never": string;
  "know.tried": string;
  "know.noRank": string;
  "know.unknown": string;
  /** Param: {stars}, a star level. */
  "know.wall": string;
  "know.noWall": string;
  "know.addTicked": string;
  /** Param: {count}, the songs it adds. */
  "know.addNearest": string;
  /** Params: {count}, the songs a set has room for, and {total}, the songs to add. */
  "know.setTakes": string;
  "know.setHoldsAll": string;
  "know.perSecond": string;
  "know.bpm": string;
  "know.reach.help": string;
  /** Param: {count}, the charts. */
  "know.almost.fullCombo.count": string;
  "know.almost.fullCombo.none": string;
  /** Param: {count}, the charts. */
  "know.almost.donderful.count": string;
  "know.almost.donderful.none": string;
  /** Param: {rank}, a score rank's name. */
  "know.ranks.middle": string;
  "know.ranks.middleNone": string;
  "know.ranks.none": string;
  /** Param: {range}, one or more bands such as 5.5–6.0. */
  "know.best.perSecond": string;
  /** Param: {range}, one or more bands such as 160–179. */
  "know.best.bpm": string;
  "know.best.changing": string;
  "know.best.none": string;
  "know.changing": string;
  "know.almost.fullCombo": string;
  "know.almost.donderful": string;
  "panel.art": string;
  /** The plate's own name is Hiroba's data, shown as written. */
  "medal.heading": string;
  /** Param: {count}, the medals collected this season. */
  "medal.count": string;
  "medal.complete": string;
  "medal.none": string;
  "medal.unrecognised": string;
  "failure.notSignedIn": string;
  "failure.loggedOut": string;
  "failure.cardSelectUnfinished": string;
  "failure.unreachable": string;
  "failure.timedOut": string;
  "failure.cancelled": string;
  "failure.siteError": string;
  "failure.siteErrorInMaintenance": string;
  "failure.unexpectedPage": string;
  "failure.maintenance": string;
  "failure.notRefreshed": string;
  "failure.callFailed": string;
  "failure.mayClear": string;
  /** Param: {code}, codes for a report (path, status, parser verdict); never page text. */
  "failure.code": string;
  "crash.page": string;
  "crash.window": string;
  "crash.reload": string;
  "crash.start": string;
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
  "costume.kigurumiWarning": string;
  "edit.reset": string;
  "write.sync": string;
  "write.saving": string;
  "costume.history": string;
  "costume.history.title": string;
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
  "write.sessionGone": string;
  "write.sessionGoneAfterSave": string;
  /** Param: {field}, which value of the set was refused, as a costume.part text. */
  "write.invalidTarget": string;
  "write.failed": string;
  /** Param: {words}, Hiroba's own words for the failure, as the site writes them. */
  "write.failedBecause": string;
  "write.readBack": string;
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
  /** Param: {bpm}, the tempo as taiko.wiki gives it, such as 154 or 120–240. */
  "song.bpm": string;
  "favorites.reading": string;
  /** The お気に入り folder on Hiroba, as the Favourites page names it. */
  "favorites.folder.heading": string;
  /** The same folder in the sets drawer, among the sets kept on the device. */
  "favorites.folderEmpty": string;
  "favorites.sets": string;
  "favorites.newSet": string;
  /** Param: {number}, from 1. A new set's name until the player renames it. */
  "favorites.setName": string;
  "favorites.set.nameLabel": string;
  /** Marks a set whose songs are the folder's, in the order of its slots. */
  "favorites.set.sameAsFolder": string;
  "favorites.setEmpty": string;
  "favorites.saveToSet": string;
  "favorites.saveSet": string;
  "favorites.current": string;
  "favorites.edit": string;
  "favorites.rename": string;
  "favorites.rename.title": string;
  "favorites.inUse": string;
  "favorites.history": string;
  "favorites.history.title": string;
  "favorites.history.songs": string;
  "favorites.history.current": string;
  "favorites.history.putBack": string;
  "favorites.history.saveAsSet": string;
  "favorites.history.none": string;
  "favorites.replace.title": string;
  "favorites.replace.body": string;
  "favorites.replace.confirm": string;
  "sort.handle": string;
  "sort.instructions": string;
  "sort.picked": string;
  "sort.over": string;
  "sort.dropped": string;
  "sort.cancelled": string;
  "favorites.addSongs": string;
  /** Param: {name}, the song as the page shows it. */
  "favorites.removeSong": string;
  "favorites.delete": string;
  "favorites.delete.title": string;
  /** Param: {name}, the set's name. */
  "favorites.delete.body": string;
  "favorites.delete.cancel": string;
  "favorites.song.heading": string;
  "favorites.song.none": string;
  "favorites.song.change": string;
  "favorites.ura": string;
  "picker.title.single": string;
  "picker.title.multi": string;
  "picker.search": string;
  /** The search field's helper: what it looks in. */
  "picker.searchHint": string;
  "picker.genre": string;
  "picker.difficulty": string;
  "picker.stars": string;
  /** A filter menu's first choice, which takes every song. */
  "picker.all": string;
  "picker.level": string;
  "picker.none": string;
  "picker.loading": string;
  "picker.failed": string;
  "picker.offeredReading": string;
  "picker.offeredFailed": string;
  /** Param: {max}, how many songs a set holds. */
  "picker.limit": string;
  "picker.close": string;
  /** The song search's way back out to the page under it. */
  "search.leave": string;
  "search.clear": string;
  /** Param: {query}, a search kept on the device. */
  "search.forget": string;
  /** While the song search reads taiko.wiki's whole song list again. */
  "search.readingList": string;
  "search.listRead": string;
  /** Under "nothing found" on a touch screen. Param: {seconds}, the long hold's. */
  "search.newSongPull": string;
  /** Under "nothing found" on a computer. Params: {button}, Read again's name; {seconds}. */
  "search.newSongHold": string;
  "details.charts": string;
  /** Param: {count}, the chart's most notes in a row. */
  "details.maxCombo": string;
  "details.branched": string;
  "details.noPicture": string;
  /** Notes hit in each second over a song: 烈度 in Chinese, 密度 in Japanese. */
  "details.density": string;
  /** Param: {value}, the most notes in one second. */
  "details.densityPeak": string;
  /** Params: {peak}, the most notes in one second, and {at}, when it comes, as m:ss. */
  "details.densityLine": string;
  "details.densityReading": string;
  "details.noDensity": string;
  "details.densityFailed": string;
  "details.readDensity": string;
  /** Param: {value}, the chart's notes over its length, two decimals. */
  "details.averageDensity": string;
  "details.branch": string;
  "details.branch.normal": string;
  "details.branch.advanced": string;
  "details.branch.master": string;
  "details.pictureFailed": string;
  /** Params: {difficulty} (a difficulty.* text), {n} and {count}. A chart picture's name. */
  "details.picture": string;
  "details.drawnPicture": string;
  "details.noTja": string;
  "details.noCdn": string;
  "details.chartDiffers": string;
}

export type MessageKey = keyof Messages;
