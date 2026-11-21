export const en = {
  "app.title": "A Better Taiko Hiroba",
  /** Param: {name}, the system's language in its own words (LOCALE_NAMES). */
  "language.system": "System default ({name})",
  "nav.overview": "Overview",
  "nav.scores": "Scores",
  "nav.rating": "Rating",
  "nav.knowYourself": "Know yourself",
  "nav.costume": "Costume",
  "nav.nameTitle": "Nickname & title",
  "nav.favorites": "Favourites",
  "nav.gameSettings": "Game settings",
  "nav.settings": "Settings",
  "nav.menu": "Menu",
  "nav.back": "Back",
  "nav.pipelines": "Pipelines",
  "pipelines.io": "Hiroba interaction",
  "pipelines.external": "External sources",
  "pipelines.now": "Running and waiting",
  "pipelines.ended": "Recently ended",
  "pipelines.waiting": "{count} waiting",
  "pipelines.more": "More",
  "pipelines.less": "Less",
  "pipelines.pictures": "Hiroba pictures",
  "pipelines.history": "Recent plays",
  "pipelines.scores": "Scores",
  "pipelines.read": "Read",
  "pipelines.exclusive": "Read alone",
  "pipelines.write": "Write",
  "pipelines.succeeded": "Succeeded",
  "pipelines.failed": "Failed",
  "pipelines.stopped": "Stopped by the sign-out",
  "pipelines.running": "Running for {seconds} s",
  "pipelines.queued": "Waiting for {seconds} s",
  "pipelines.requests": "requests: {count}",
  "pipelines.took": "took {seconds} s",
  "pipelines.startedAt": "started {time}",
  "pipelines.onRequest": "Request {index}: {request}",
  "pipelines.onRequestOf": "Request {index} of {total}: {request}",
  "pipelines.failedAt": "Request {index} failed: {request}",
  "pipelines.stoppedAfter": "Stopped after request {index}: {request}",
  "pipelines.noRequest": "No request was sent",
  "pipelines.code": "Code: {code}",
  "pipelines.op.readProfile": "My page",
  "pipelines.op.refreshHiroba": "Hiroba refresh",
  /** Param: {page}. A page of the recent plays walk, in the play history pipeline. */
  "pipelines.op.recentPlaysPage": "Recent plays, page {page}",
  /** Param: {genre}, its name. A genre's score list, in Hiroba's IO pipeline. */
  "pipelines.op.scoreList": "Score list: {genre}",
  /** Params: {song}, its number, and {difficulty}. A chart's details, in the scores pipeline. */
  "pipelines.op.scoreDetail": "Score details: song {song}, {difficulty}",
  "pipelines.op.openCostumeEditor": "Costume editor",
  "pipelines.op.openTitleEditor": "Title editor",
  "pipelines.op.previewCostume": "Costume preview",
  "pipelines.op.changeCostume": "Costume sync",
  "pipelines.op.changeTitle": "Title sync",
  "pipelines.op.changeName": "Nickname sync",
  "pipelines.op.openFavorites": "Favourites",
  "pipelines.op.changeFolder": "Folder sync",
  "pipelines.op.changeFavoriteSong": "Favourite song sync",
  "pipelines.op.readSongPicker": "Song picker list",
  "pipelines.op.openGameSettings": "Game settings",
  "pipelines.op.changeGameSettings": "Game settings sync",
  "pipelines.op.readUpdateFeed": "Update check",
  "pipelines.op.readSongCatalogue": "taiko.wiki song list",
  "pipelines.op.readChineseNames": "Chinese song names",
  "pipelines.op.readRatingData": "Rating data",
  "pipelines.op.picture": "Picture",
  "pipelines.op.chartPicture": "Chart picture",
  "pipelines.op.chartDensity": "Chart file",
  "pipelines.op.chartTja": "Chart file to draw",
  "pipelines.picture.myDon": "My Don",
  "pipelines.picture.titlePlate": "Name plate",
  "pipelines.picture.medalPlate": "Don Medal plate",
  "pipelines.picture.scorePanel": "Score panel",
  "pipelines.picture.rankIcon": "Score rank icon",
  "pipelines.picture.crownIcon": "Crown icon",
  "pipelines.picture.courseIcon": "Difficulty icon",
  "pipelines.picture.optionIcon": "Play option icon",
  "pipelines.picture.costumeItem": "Costume thumbnail",
  /** Param: {page}. Under a walk's failure: the page whose request failed. */
  "history.failedPage": "It stopped at page {page}.",
  /** 良, 可, 不可, 連打 and the longest combo: a row's hit counts, in taiko.wiki's words. */
  "history.good": "Good",
  "history.ok": "OK",
  "history.bad": "Bad",
  "history.roll": "Drumroll",
  "history.combo": "Max combo",
  /** Param: {speed}, the speed option's multiplier: its icon's name, shown when it is not 1. */
  "history.speed": "Speed ×{speed}",
  /** The play options ドロン, あべこべ, きまぐれ, でたらめ and サポート譜面: their icons' names. */
  "history.doron": "Vanish",
  "history.abekobe": "Inverse",
  "history.kimagure": "Whimsical",
  "history.detarame": "Chaotic",
  "history.support": "Support chart",
  "history.addToSet": "Add to a set",
  "history.setHolds": "Already has this song",
  "history.setFull": "Already holds {count} songs",
  /** Param: {page}. While a read of scores walks recent plays. */
  "scores.readingPlays": "Reading recent plays, page {page}…",
  /** Params: {done} and {total}, the lists or the charts read so far, and how many in all. */
  "scores.readingLists": "Reading the score lists ({done} of {total})…",
  "scores.readingCharts": "Reading scores ({done} of {total})…",
  /** Param: {song}, Hiroba's title. While one song's scores are read again. */
  "scores.readingSong": "Reading the scores of {song}…",
  /** Param: {genre}. Under a read's failure: the list whose request failed. */
  "scores.failedList": "It stopped at the {genre} list.",
  /** Params: {song} and {difficulty}. Under a read's failure: the chart whose request failed. */
  "scores.failedChart": "It stopped at {song} ({difficulty}). Read again goes on from there.",
  /** On the row of a song Hiroba took off its lists: its scores stay, and the row opens nothing. */
  "scores.removed": "Removed",
  /** Said at the window's foot as such a row is pressed. */
  "scores.removedNote":
    "This song was removed from the game: Hiroba no longer lists it. These are the scores read before.",
  /** On the scores page with nothing kept yet: how to read them, on a touch screen or not. */
  "scores.emptyPull":
    "No scores here yet. Pull the page down to read them all; the first read takes a few minutes.",
  "scores.emptyReadAgain":
    "No scores here yet. Press Read again, or F5, to read them all; the first read takes a few minutes.",
  /** After a read of all scores that found no chart played since the last: why nothing changed. */
  "scores.nothingNew":
    "No chart was played since the last read, so no score changed. Scores follow recent plays: play some, then read again.",
  /** Param: {count}, charts played or stopped at but not read yet. */
  "scores.unread": "Charts still to read: {count}. Read again reads them.",
  "rating.figure.rating": "Rating",
  "rating.figure.power": "Power",
  "rating.figure.stamina": "Stamina",
  "rating.figure.speed": "Speed",
  "rating.figure.burst": "Burst",
  "rating.figure.accuracy": "Accuracy",
  "rating.figure.rhythm": "Rhythm",
  "rating.figure.complex": "Complexity",
  "rating.best": "The 20 that count",
  "rating.overTime": "Rating over time",
  "rating.next": "The next 20",
  /** Param: {value}, the chart's constant in its system. */
  "rating.constant": "Const. {value}",
  /** Param: {value}, the chart's accuracy as a percentage. */
  "rating.accuracy": "{value}%",
  "rating.readingData": "Reading the rating data…",
  "rating.dataFailed": "The rating data could not be read.",
  "rating.noneRated":
    "No Extreme or Extreme (Ura) chart is rated yet: a chart needs at least 75% accuracy to count.",
  "rating.noneRatedV2":
    "No Hard, Extreme or Extreme (Ura) chart is rated yet: a chart needs at least 75% accuracy to count.",
  /** Rating's switch between the two versions, as screen readers name it. */
  "rating.switch": "Rating version",
  "rating.system.ourtaikoV1": "OurTaiko V1",
  "rating.system.ourtaikoV2": "OurTaiko V2",
  "rating.systemShort.ourtaikoV1": "V1",
  "rating.systemShort.ourtaikoV2": "V2",
  /** The Overview's and Rating's button that makes the page a picture to share. */
  "snapshot.button": "Share as a picture",
  /** The picture's ways out, as its menu lists them: the system's share sheet, a copy, a file. */
  "snapshot.share": "Share picture",
  "snapshot.copy": "Copy picture",
  "snapshot.save": "Save picture",
  /** The button's name while the picture is made. */
  "snapshot.making": "Making the picture…",
  "snapshot.copied": "Picture copied.",
  "snapshot.saved": "Picture saved.",
  "snapshot.failed": "The picture could not be made. Please try again.",
  /** A song's action: read its charts again. */
  "scores.readSong": "Read this song's scores again",
  /** Asks before a read of every score, after a long hold on the page's read again. */
  "scores.readEvery.title": "Read every score again?",
  /** Param: {count}, the played charts, as the locale writes a count. */
  "scores.readEvery.body":
    "This reads the scores of all {count} charts you have played from Hiroba again. It is slow: it takes several minutes.",
  "scores.readEvery.cancel": "Cancel",
  "scores.readEvery.confirm": "Read all again",
  /** The sort chip's name, and its menu's. */
  "scores.sort": "Sort",
  /** The sorts: by name, the order with none chosen, then the others. */
  "scores.sort.name": "Name",
  "scores.sort.score": "Score",
  "scores.sort.rank": "Score rank",
  "scores.sort.crown": "Crown",
  "scores.sort.recent": "Recently played",
  /** With charts kept, but none the search and the filters leave. */
  "scores.noMatch": "No chart matches the search and the filters.",
  /** A chart's details: Hiroba's Japan ranking, and its place there. */
  "scores.ranking": "Japan ranking",
  /** Param: {place}, the place, as the locale writes a count. */
  "scores.place": "No. {place}",
  "scores.noPlace": "Not ranked",
  /** The four play counts: also the sorts by plays, full combos and clears. */
  "scores.plays": "Plays",
  "scores.clears": "Clears",
  "scores.fullCombos": "Full Combos",
  "scores.donderfuls": "Donderful Combos",
  /** 区間毎詳細成績, and one section of it. Param: {number}, from 1. */
  "scores.sections": "By section",
  "scores.overTime": "High score over time",
  "chart.oneRead": "Read your scores again on another day, and the change shows here.",
  "scores.section": "Section {number}",
  /** Param: {time}, when the chart's details were read. */
  "scores.readAt": "Read on {time}",
  "settings.language": "Language",
  "settings.account": "Account",
  /** Param: {name}, the nickname, as Hiroba writes it. */
  "settings.signedInAs": "Signed in as {name}",
  "settings.signedIn": "Signed in",
  "settings.signedOut": "Not signed in",
  "settings.updates": "Updates",
  /** Param: {version}, this build's version, such as 0.1.0. */
  "settings.version": "Version {version}",
  "settings.songData": "Song data",
  "settings.chartSource": "Chart pictures",
  "settings.chartSourceHint":
    "ABTH CDN shows ESE's charts as TJA Renderer drew them ahead of time, kept on GitHub, so they come even while ESE is slow; TJA Renderer draws each chart here from its TJA file in ESE; taiko.wiki shows the pictures its editors link.",
  "settings.chartSource.cdn": "ABTH CDN",
  "settings.chartSource.tja": "TJA Renderer",
  "settings.chartSource.wiki": "taiko.wiki",
  "settings.taikoWiki": "taiko.wiki",
  "settings.taikoWikiGives":
    "Artists, genres, star levels, BPM, song names in other languages, and the chart pictures it links",
  "settings.chineseWiki": "Chinese Taiko no Tatsujin Wiki (taiko.fandom.com/zh)",
  "settings.chineseWikiGives": "Official Chinese song names, used under CC BY-SA",
  "settings.chartWiki": "Taiko no Tatsujin Fumen Wiki (wikiwiki.jp/taiko-fumen)",
  "settings.chartWikiGives": "Chart pictures",
  "settings.ourTaiko": "OurTaiko (ourtaiko.org)",
  "settings.ourTaikoGives":
    "Both ratings' formulas (MIT), the constants it publishes, and the map from songs to ESE's charts",
  "settings.fumenDb": "Taiko no Tatsujin Fumen Database (fumen-database.com)",
  "settings.fumenDbGives":
    "The chart constants and measurements behind the V1 rating, through OurTaiko",
  "settings.abthCdn": "ABTH CDN (hicirtech.github.io/abth-cdn)",
  "settings.abthCdnGives":
    "ESE's charts drawn ahead of time, and their note counts, checked for changes every hour; no chart file is kept",
  "settings.ese": "ESE by TJADB (ese.tjadataba.se)",
  "settings.eseGives":
    "Each song's chart file, read for its note density and drawn pictures; only the counts and the pictures are kept",
  "settings.tjaRenderer": "TJA Renderer (github.com/jack9966qk/TJARenderer)",
  "settings.tjaRendererGives": "Chart pictures drawn from TJA files, used under the MIT License",
  "settings.github": "GitHub",
  "settings.githubGives": "The app's source code, its issues and its releases",
  "settings.songLevels": "Song levels",
  "settings.shownDifficulty": "Difficulty shown first",
  "settings.shownDifficultyHint":
    "Its star level shows in front, with the Ura chart beside Extreme; the other levels stack behind it and spread out on a click.",
  "settings.scores": "Scores",
  "settings.startingSort": "Default sort",
  "settings.startingSortHint": "Scores opens in this order.",
  "settings.rating": "Rating",
  "settings.startingRating": "Default rating",
  "settings.startingRatingHint":
    "Rating opens on this one, and Know yourself suggests charts by it; the switch at Rating's top shows the other until you leave it.",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.theme.default": "Default",
  "settings.theme.hiroba": "Hiroba's colours",
  "settings.mode": "Light or dark",
  "settings.mode.system": "System default",
  "settings.mode.light": "Light",
  "settings.mode.dark": "Dark",
  "signIn.intro":
    "Sign in with your Bandai Namco ID to read your Donder Hiroba profile. The sign-in page is Hiroba's own; this app never sees your password.",
  "signIn.action": "Sign in to Hiroba",
  "signIn.inProgress": "Finish signing in, including choosing your card, in the sign-in window.",
  "signIn.cancel": "Cancel sign-in",
  /** The in-app browser's own close button (Android). */
  "signIn.closeBrowser": "Close",
  "signIn.cancelled": "Sign-in was cancelled.",
  "signIn.noSession": "Sign-in finished, but Hiroba did not start a session. Please try again.",
  "signIn.unavailable": "The sign-in window could not be opened. Please try again.",
  /** Param: {host}, where the sign-in was sent, on a page that is not https. */
  "signIn.refused":
    "Sign-in stopped: it was sent to {host}, which is not on https and which this app does not open. Please report that host name.",
  /** Param: {host}, a service that refuses to sign in inside an app; the system's browser opens. */
  "signIn.refuser":
    "Sign-in stopped: {host} does not allow signing in inside an app. Hiroba's sign-in page is opening in your browser; signing in there does not sign this app in. Add a mail address and password to your Bandai Namco ID there once, then sign in here with them.",
  "signOut.action": "Sign out",
  "signOut.note":
    "You stay signed in on this device until you sign out. Hiroba's pictures, recent plays and scores stay here after that too.",
  "update.check": "Check for updates",
  "update.checking": "Checking for updates…",
  "update.upToDate": "You're up to date.",
  "update.failed": "Couldn't check for updates.",
  "update.openReleases": "Open the releases page",
  "update.download": "Download",
  "update.later": "Later",
  "profile.reading": "Reading your profile from Hiroba…",
  "profile.readAgain": "Read again",
  /** Param: {title}. */
  "profile.title": "Title: {title}",
  /** Param: {time}, already formatted. */
  "profile.fetchedAt": "Last updated {time}",
  /** The grey line over my page kept from an earlier read. Param: {time}, already formatted. */
  "profile.lastRead": "Hiroba could not be read. This is your profile as last read ({time}).",
  "profile.noTitle": "No title",
  /** Param: {dan}, a `dan.N` text, N being the board number read off my page's label. */
  "profile.dan": "Dan-i: {dan}",
  "profile.danUnreadable": "Your dan-i could not be read.",
  /** Board numbers as core numbers them: 1 (五級) to 15 (十段); 16 to 19 are 玄人, 名人, 超人, 達人. */
  // 日本語 is core's DAN_NAMES, which a test holds it to; the others are taiko.wiki's.
  "dan.1": "5th Kyu",
  "dan.2": "4th Kyu",
  "dan.3": "3rd Kyu",
  "dan.4": "2nd Kyu",
  "dan.5": "1st Kyu",
  "dan.6": "Shodan",
  "dan.7": "2nd Dan",
  "dan.8": "3rd Dan",
  "dan.9": "4th Dan",
  "dan.10": "5th Dan",
  "dan.11": "6th Dan",
  "dan.12": "7th Dan",
  "dan.13": "8th Dan",
  "dan.14": "9th Dan",
  "dan.15": "10th Dan",
  "dan.16": "Kuroto",
  "dan.17": "Meijin",
  "dan.18": "Chojin",
  "dan.19": "Tatsujin",
  "profile.myDonAlt": "Your My Don, as Hiroba draws it",
  "pictures.loading": "Loading Hiroba's picture…",
  "pictures.readAgain.title": "Read the pictures again?",
  "pictures.readAgain.body":
    "Hiroba's pictures are kept on this device for good. This reads the pictures on this page from Hiroba again; any that cannot be read stay as they are.",
  "pictures.readAgain.cancel": "Cancel",
  "pictures.readAgain.confirm": "Read again",
  "pictures.readAgain.done": "Hiroba's pictures were read again.",
  "pictures.readAgain.failed":
    "Some pictures could not be read again and stay as they were. Please try again.",
  "tips.label": "Tip",
  "tips.step": "{step} of {count}",
  "tips.next": "Next",
  "tips.done": "Got it",
  "tips.skip": "Skip the tips",
  "tips.app.menuSwipe":
    "Swipe right from the screen's left side to open the menu; with the menu open, swipe right again for the Pipelines page.",
  "tips.app.readAgainKeys": "F5 or Ctrl+R (⌘R on a Mac) reads the page again.",
  "tips.app.scan": "The button beside the app's name scans a gift's QR code.",
  "tips.overview.portrait.touch":
    "Long-press your My Don to open the Costume page, and your name plate to open the Nickname & title page.",
  "tips.overview.portrait.mouse":
    "Click your My Don to open the Costume page, and your name plate to open the Nickname & title page.",
  "tips.overview.readAgain.touch":
    "Pull down to read your page again; past the point, hold six seconds to read this page's pictures from Hiroba again.",
  "tips.overview.readAgain.mouse":
    "Click this arrow to read your page again; hold it six seconds to read this page's pictures from Hiroba again.",
  "tips.overview.songSearch":
    "With the song search open, the same six-second hold reads taiko.wiki's song list again, for a song just added.",
  "tips.overview.share": "This button shares your profile as a picture.",
  "tips.scores.readEvery.touch": "Pull down and hold six seconds to read every score again.",
  "tips.scores.readEvery.mouse": "Hold this arrow six seconds to read every score again.",
  "tips.scores.row.touch": "Long-press a row to add its song to a set.",
  "tips.scores.row.mouse": "Right-click a row to add its song to a set.",
  "tips.scores.filters": "This row of filters slides sideways for the rest.",
  "tips.rating.system": "Switch between OurTaiko V1 and V2 here.",
  "tips.rating.share": "This button shares your rating as a picture.",
  "tips.knowYourself.cards":
    "Open a card for the charts you have not cleared yet, and add their songs to a set.",
  /** Points at "A little harder", first of Know yourself's three cards of charts to play next. */
  "tips.knowYourself.suggestions":
    "Three cards suggest what to play next: just above your level, nearly counting in your rating, and at the tempo and density you play most.",
  "tips.costume.readAgain.touch":
    "Pull down and hold six seconds to read the items' pictures from Hiroba again.",
  "tips.costume.readAgain.mouse":
    "Hold this arrow six seconds to read the items' pictures from Hiroba again.",
  "tips.costume.history": "The costumes you wore before are kept here.",
  "tips.nameTitle.readAgain.touch":
    "Pull down and hold six seconds to read your name plate from Hiroba again.",
  "tips.nameTitle.readAgain.mouse":
    "Hold this arrow six seconds to read your name plate from Hiroba again.",
  "tips.favorites.setsDrawer": "Swipe left from the screen's right edge to open your sets.",
  "tips.favorites.setMenu.touch": "In your sets, long-press one to rename or delete it.",
  "tips.favorites.setMenu.mouse": "In your sets, right-click one to rename or delete it.",
  "tips.favorites.reorder.touch":
    "While a set is being edited, long-press a song and drag it to move it.",
  "tips.favorites.reorder.mouse":
    "While a set is being edited, drag a song by its handle to move it.",
  "tips.favorites.history": "The folders you synced before are kept here.",
  "tips.favorites.gift": "This button makes a gift of songs for another player.",
  "tips.gameSettings.page": "Change your game settings here, as on Hiroba's own settings page.",
  "tips.gameSettings.sync":
    "Your changes stay here until “Sync to Hiroba” sends them, all at once.",
  /** Score ranks by Hiroba's rank image number (best_score_rank_N, 2 to 8); no page names them. */
  // 日本語 is core's SCORE_RANK_NAMES, held by a test; English romanises colour and tier; pink is 粉.
  "scoreRank.2": "White Iki",
  "scoreRank.3": "Bronze Iki",
  "scoreRank.4": "Silver Iki",
  "scoreRank.5": "Gold Miyabi",
  "scoreRank.6": "Pink Miyabi",
  "scoreRank.7": "Purple Miyabi",
  "scoreRank.8": "Rainbow Kiwami",
  "crowns.heading": "Crowns",
  /** Crowns by what they record (clear, full combo, Donderful Combo), as taiko.wiki words it. */
  "crowns.silver": "Clear",
  "crowns.gold": "Full Combo",
  "crowns.donderful": "Donderful Combo",
  /** The score-rank block heading. Not 评级/評級: taiko.wiki uses those for the skill Rating. */
  "panel.ranks": "Score ranks",
  /** Params: {count} and {total} (the sum of its block), both already formatted. */
  "panel.countOf": "{count} of {total}",
  /** The same count, named. Adds {name}. */
  "panel.countTitle": "{name}: {count} of {total}",
  "know.ladder": "Clear ladder",
  "know.never": "Never played",
  "know.tried": "Played, not cleared",
  "know.plays": "Plays over time",
  "know.playsSoFar": "{count} plays so far.",
  "know.playsSince": "{count} plays so far, {more} more since {date}.",
  "know.crownsOverTime": "Crowns over time",
  "know.crownsNoChange": "How your crowns change from read to read.",
  "know.crownsSince": "{clears} more clears and {combos} more Full Combos since {date}.",
  "know.showNever": "Show charts never played",
  "know.ranksOverTime": "Score ranks over time",
  "know.ranksNoChange": "How your score ranks' shares change from read to read.",
  "know.ranksSince": "{rank} or better went from {from} to {to} since {date}.",
  "know.noRank": "No rank yet",
  "know.unknown": "No wiki data",
  /** Param: {stars}, a star level. */
  "know.wall": "Your wall is ★{stars}: fewer than half of the charts you tried there are cleared.",
  "know.noWall":
    "No wall yet: no star level with five or more tried charts has fewer than half of them cleared.",
  "know.addTicked": "Add ticked songs to a set",
  /** Param: {count}, the songs it adds. */
  "know.addNearest": "Add the nearest {count} to a set",
  /** Params: {count}, the songs a set has room for, and {total}, the songs to add. */
  "know.setTakes": "Adds {count} of {total}",
  "know.setHoldsAll": "Already has these songs",
  "know.perSecond": "Hits/s",
  "know.bpm": "BPM",
  "know.reach.help": "Where the top 10% of your high scores at this difficulty are most common",
  /** Param: {count}, the charts. */
  "know.almost.fullCombo.count": "Charts within a few Bad hits of a Full Combo: {count}.",
  "know.almost.fullCombo.none": "No chart is a few Bad from a Full Combo yet.",
  /** Param: {count}, the charts. */
  "know.almost.donderful.count": "Charts within a few OK hits of a Donderful Combo: {count}.",
  "know.almost.donderful.none": "No chart is a few OK from a Donderful Combo yet.",
  /** Param: {rank}, a score rank's name. */
  "know.ranks.middle": "Half of the charts you played rank {rank} or better.",
  "know.ranks.middleNone": "Half of the charts you played have no rank yet.",
  "know.ranks.none": "You have not played a chart at this difficulty yet.",
  /** Param: {range}, one or more bands such as 5.5–6.0. */
  "know.best.perSecond": "Your best range is {range} hits/s.",
  /** Param: {range}, one or more bands such as 160–179. */
  "know.best.bpm": "Your best BPM range is {range}.",
  "know.best.changing": "You do best on songs whose tempo changes.",
  "know.best.none": "Not enough plays yet to name your best range.",
  "know.changing": "Tempo changes",
  "know.almost.fullCombo": "Near a Full Combo",
  "know.almost.donderful": "Near a Donderful Combo",
  /** Know yourself's three cards of charts to play next. */
  "know.suggest.harder": "A little harder",
  "know.suggest.comfort": "Scores in comfort",
  "know.suggest.joy": "For the joy of it",
  /** Params: {level}, a constant as its rating writes it, and {rating}, the rating's full name. */
  "know.suggest.harder.summary":
    "Not cleared yet, just above your level: Const. {level} by {rating}.",
  /** Param: {accuracy}, a percentage such as 95.24%. */
  "know.suggest.comfort.summary":
    "Cleared charts within your level that would count at your usual {accuracy}.",
  /** Params: {bpm}, a tempo, and {hits}, hits per second. */
  "know.suggest.joy.summary":
    "Charts near {bpm} BPM and {hits} hits/s, the tempo and density you play most.",
  "know.suggest.harder.none": "Every chart above your level is cleared.",
  "know.suggest.comfort.none":
    "No cleared chart within your level would count at your usual accuracy.",
  "know.suggest.comfort.fewRated":
    "Once 20 charts are rated, the cleared ones closest to counting show here.",
  "know.suggest.joy.none": "No chart is near the tempo and density you play most.",
  "know.suggest.joy.noPlays": "Not enough plays yet to tell the tempo and density you play most.",
  /** On a difficulty the rating does not rate. */
  "know.suggest.unrated": "OurTaiko V1 rates only Extreme and Extreme (Ura) charts.",
  "know.suggest.unratedV2": "OurTaiko V2 rates only Hard, Extreme and Extreme (Ura) charts.",
  /** A chart's step to count: params {now} and {needed}, both percentages such as 95.24%. */
  "know.suggest.toCount": "{now} → {needed}",
  /** Param: {value}, hits per second. */
  "know.suggest.hitsPerSecond": "{value} hits/s",
  "panel.art": "Score panel",
  /** The plate's own name is Hiroba's data, shown as written. */
  "medal.heading": "Don Medals",
  /** Param: {count}, the medals collected this season. */
  "medal.count": "Collected: {count}",
  "medal.complete": "COMPLETE",
  "medal.none": "Hiroba isn't showing a Don Medal plate right now.",
  "medal.unrecognised": "This version can't read Hiroba's Don Medal plate yet.",
  "failure.notSignedIn": "You are not signed in.",
  "failure.loggedOut": "Your Hiroba session has ended. Please sign in again.",
  "failure.cardSelectUnfinished":
    "Sign-in stopped before a card was chosen. Please sign in again and choose your card.",
  "failure.unreachable": "Hiroba could not be reached. Check your connection and try again.",
  "failure.timedOut": "Hiroba took too long to answer. Please try again.",
  "failure.cancelled": "The request was cancelled.",
  "failure.siteError": "Hiroba answered with an error. It may be having trouble for now.",
  "failure.siteErrorInMaintenance":
    "Hiroba is down for its daily maintenance, from 05:00 to 07:00 JST.",
  "failure.unexpectedPage": "Hiroba answered with a page this app did not expect.",
  "failure.maintenance":
    "Hiroba is closed for maintenance every day from 05:00 to 07:00 JST. It was not asked to refresh.",
  "failure.notRefreshed": "Hiroba could not refresh your play data, so nothing more was read.",
  "failure.callFailed": "Something went wrong in the app while reading this.",
  "failure.mayClear": "Refreshing or trying again may fix this.",
  /** Param: {code}, codes for a report (path, status, parser verdict); never page text. */
  "failure.code": "Code for a report: {code}",
  "crash.page":
    "Something went wrong on this page. Opening another page or restarting the app may fix this.",
  "crash.window": "Something went wrong in the app. Reloading it may fix this.",
  "crash.reload": "Reload",
  "crash.start": "The app could not start. Installing it again may fix this.",
  "platform.unsupported": "This build runs only inside the desktop or Android app.",
  /** The name plate on the Overview: its accessible name, and what a long-press on it opens. */
  "plate.open": "Open the Nickname & title page",
  "plate.openByLongPress": "Long-press your name plate to open the Nickname & title page.",
  "costume.open": "Open the Costume page",
  "costume.openByLongPress": "Long-press your My Don to open the Costume page.",
  "costume.reading": "Reading your costume from Hiroba…",
  "costume.preview.alt": "My Don in this costume, as Hiroba draws it",
  "costume.preview.loading": "Updating the preview…",
  "costume.preview.unavailable": "The preview could not be shown.",
  "costume.tab.colours": "Colours",
  "costume.tab.items": "Costume",
  /** By the tab's name in Hiroba's guide: かお, どう, てあし, then the five slots from きぐるみ (mascot). */
  "costume.part.colorFace": "Face",
  "costume.part.colorBody": "Torso",
  "costume.part.colorLimb": "Limbs",
  "costume.part.costume1": "Mascot",
  "costume.part.costume2": "Head",
  "costume.part.costume3": "Body",
  "costume.part.costume4": "Makeup",
  "costume.part.costume5": "Mini Character",
  /** Param: {id}. An item or a colour by its number: the page gives no names. */
  "costume.id": "#{id}",
  "costume.remove": "Remove",
  /** Params: {part} (a costume.part text) and {id}. */
  "costume.item.label": "{part} #{id}",
  /** Param: {count}, how many did not come. */
  "costume.thumbnails.unavailable":
    "Some thumbnails didn't load ({count}); their numbers are shown instead.",
  "costume.kigurumiWarning": "A Mascot takes off Head, Body, Makeup and Mini Character.",
  "edit.reset": "Reset",
  "write.sync": "Sync to Hiroba",
  "write.saving": "Syncing… then reading it back",
  "costume.history": "History",
  "costume.history.title": "Costume history",
  /** Marks the entry that is the set Hiroba shows now. */
  "costume.history.wornNow": "Worn now",
  /** Param: {position}, 1 for the newest. An entry's name as a button. */
  "costume.history.entry": "Costume {position}",
  /** Param: {position}. As costume.history.entry, for the entry worn now. */
  "costume.history.entryWorn": "Costume {position}, worn now",
  /** Also the title row's label in a write's comparison. */
  "title.heading": "Title",
  "title.reading": "Reading your titles from Hiroba…",
  "title.open": "Show the titles",
  "title.close": "Hide the titles",
  "title.clear": "Clear your choice",
  "title.noMatch": "No title matches.",
  "title.none": "Hiroba lists no titles for you to choose from.",
  "title.current": "Current",
  /** Param: {count}, how many titles of the list have the worn title's name. */
  "title.shared":
    "{count} of your titles have this name, so the app cannot tell which one you wear.",
  "title.notListed":
    "Your current title is not in this list. It may be built from parts, which this version cannot read or change back.",
  "name.heading": "Nickname",
  /** Params: {count}, how many characters it holds, and {max}. */
  "name.counter": "{count} / {max}",
  /** Hiroba's own warning above the field, as the site writes it, in every language. */
  "name.siteWarning":
    "※本名などの個人情報の入力は、おやめください ※Do not enter any personal information.",
  "name.same": "That is your nickname already.",
  /** Quotes Hiroba's sentence that nicknames cannot be changed now, as the site writes it. */
  "name.closed":
    "Hiroba says nicknames can't be changed right now: 今はドンだーネームは変更できないドン！",
  "write.sessionGone": "Hiroba ended the session before anything was saved. Please sign in again.",
  "write.sessionGoneAfterSave":
    "Hiroba ended the session. Whether the change was saved is unknown; check it after signing in.",
  /** Param: {field}, which value of the set was refused, as a costume.part text. */
  "write.invalidTarget": "This app refused the change before sending it: {field}.",
  "write.failed": "Sync to Hiroba failed. Please try again.",
  /** Param: {words}, Hiroba's own words for the failure, as the site writes them. */
  "write.failedBecause": "Sync to Hiroba failed ({words}). Please try again.",
  "write.readBack":
    "Hiroba's result differs from what was expected, so the page now shows what Hiroba holds.",
  /** The words of {field} in "write.invalidTarget": a phrase, with no capital and no full stop. */
  "write.invalid.titleNotOwned": "that title is not in your list",
  "write.invalid.nameEmpty": "the nickname is empty",
  "write.invalid.nameEdge": "the nickname starts or ends with a space",
  "write.invalid.nameTooLong": "the nickname is longer than Hiroba's form takes",
  "write.invalid.nameControl": "the nickname has a character that cannot be sent",
  "write.invalid.nameClosed": "Hiroba is not taking nickname changes right now",
  /** The genres as taiko.wiki's own locale files name them. */
  "genre.pops": "POPS",
  "genre.anime": "Anime",
  "genre.kids": "Kids",
  "genre.vocaloid": "Vocaloid",
  "genre.game": "Game Music",
  "genre.namco": "Namco Original",
  "genre.variety": "Variety",
  "genre.classic": "Classic",
  /** The charts as the game's terms name them. */
  "difficulty.easy": "Easy",
  "difficulty.normal": "Normal",
  "difficulty.hard": "Hard",
  "difficulty.oni": "Extreme",
  "difficulty.ura": "Extreme (Ura)",
  /** Params: {difficulty} (a difficulty.* text) and {level}, its stars. A level badge's name. */
  "song.level": "{difficulty} ★{level}",
  /** Param: {bpm}, the tempo as taiko.wiki gives it, such as 154 or 120–240. */
  "song.bpm": "BPM {bpm}",
  "favorites.reading": "Reading your favourites from Hiroba…",
  /** The お気に入り folder on Hiroba, as the Favourites page names it. */
  "favorites.folder.heading": "Songs in the folder",
  /** The same folder in the sets drawer, among the sets kept on the device. */
  "favorites.folderEmpty": "The favourites folder is empty.",
  "favorites.sets": "Sets",
  "favorites.newSet": "New set",
  /** Param: {number}, from 1. A new set's name until the player renames it. */
  "favorites.setName": "Set {number}",
  "favorites.set.nameLabel": "Set name",
  /** Marks a set whose songs are the folder's, in the order of its slots. */
  "favorites.set.sameAsFolder": "Same as the folder on Hiroba",
  "favorites.setEmpty": "No songs in this set yet.",
  "favorites.saveToSet": "Save to a set",
  "favorites.saveSet": "Save",
  "favorites.current": "Current favourites",
  "favorites.edit": "Edit",
  "favorites.rename": "Rename",
  "favorites.rename.title": "Rename the set",
  "favorites.inUse": "In use: {name}",
  "favorites.history": "History",
  "favorites.history.title": "Favourites history",
  "favorites.history.songs": "Songs: {count}",
  "favorites.history.current": "Current",
  "favorites.history.putBack": "Put back",
  "favorites.history.saveAsSet": "Save as a set",
  "favorites.history.none": "Nothing is kept yet. Each sync to Hiroba keeps the folder here.",
  "favorites.replace.title": "Replace the songs in {name}?",
  "favorites.replace.body":
    "{name} will hold the folder's songs, in the folder's order, instead of its current songs. The folder on Hiroba stays as it is.",
  "favorites.replace.confirm": "Replace",
  /** A gift's picture: what it is, in its bar's middle. */
  "gift.picture": "Gift",
  /** Param: {time}, when the gift was made; at the picture's bar's right. */
  "gift.givenAt": "Given {time}",
  /** The gift's QR code, for screen readers. */
  "gift.code": "QR code of the gift",
  /** Under the code: what reads it. */
  "gift.scanHint": "Scan it in A Better Taiko Hiroba to accept the gift",
  /** A gift whose songs stay hidden until it is accepted. */
  "gift.mystery": "A mystery gift",
  /** Param: {count}, the songs a mystery gift holds. */
  "gift.mysterySongs": "Songs: {count}. They show once the gift is accepted.",
  /** A received gift's title where its giver gave none. */
  "gift.untitled": "A gift",
  /** Params: {giver}, the giver's nickname; {time}, when the gift was made. */
  "gift.offer":
    "{giver} gave you these songs on {time}. Accepting syncs them to your favourites folder on Hiroba; the songs in it now stay in its history.",
  /** Params: {giver}; {time}. The same for a mystery gift, whose songs show once it is accepted. */
  "gift.offerMystery":
    "{giver} gave you a mystery gift on {time}: its songs show once you accept it. Accepting syncs them to your favourites folder on Hiroba; the songs in it now stay in its history.",
  "gift.accept": "Accept",
  /** The gift's songs are in the folder on Hiroba now. */
  "gift.accepted": "Gift accepted. Its songs are in your favourites folder on Hiroba.",
  /** Param: {giver}. The folder history's name for a gift that has no title. */
  "gift.from": "A gift from {giver}",
  /** Param: {songs}, the gift's songs the player's own picker on Hiroba does not offer yet. */
  "gift.notOffered":
    "Not accepted: Hiroba does not let you pick {songs} yet. Your favourites folder is as it was.",
  /** The same for a mystery gift, whose songs stay unnamed. */
  "gift.notOfferedMystery":
    "Not accepted: Hiroba does not let you pick some of its songs yet. Your favourites folder is as it was.",
  /** The Favourites page's button that starts a gift, and the page's name while one is made. */
  "gift.make": "Make a gift",
  "gift.new": "New gift",
  /** Param: {count}, the most songs a gift holds. */
  "gift.empty": "No songs yet. A gift holds up to {count}.",
  "gift.titleLabel": "Title",
  "gift.titleHint": "Shown on the picture, and to whoever accepts the gift",
  /** The choice between showing the songs and a mystery gift, and its name. */
  "gift.shown": "Show the songs",
  "gift.shownLabel": "Songs on the picture",
  /** Over the gift's picture as it will be shared. */
  "gift.preview": "Preview",
  /** The navigation's button that reads a QR code, and the window it opens on a phone. */
  "scan.button": "Scan a QR code",
  "scan.hint": "Point the camera at a QR code, or choose a picture of one.",
  "scan.pick": "Choose a picture",
  "scan.noCamera": "The camera cannot be used. Choose a picture instead.",
  "scan.noCode": "No QR code was found in the picture.",
  "scan.unknown": "This QR code is not one A Better Taiko Hiroba knows.",
  "sort.handle": "Move {name}",
  "sort.instructions":
    "To move an item, press Space or Enter to pick it up, the up and down arrow keys to move it, and Space or Enter again to put it down. Escape puts it back.",
  "sort.picked": "Picked up {name}.",
  "sort.over": "{name} is now number {position} of {total}.",
  "sort.dropped": "Put {name} down at number {position} of {total}.",
  "sort.cancelled": "{name} went back to where it was.",
  "favorites.addSongs": "Add songs",
  /** Param: {name}, the song as the page shows it. */
  "favorites.removeSong": "Remove {name}",
  "favorites.delete": "Delete",
  "favorites.delete.title": "Delete this set?",
  /** Param: {name}, the set's name. */
  "favorites.delete.body":
    "{name} is removed from this device. The folder on Hiroba stays as it is.",
  "favorites.delete.cancel": "Cancel",
  "favorites.song.heading": "Favourite song",
  "favorites.song.none": "Not set",
  "favorites.song.change": "Change",
  "favorites.ura": "Ura chart",
  "picker.title.single": "Choose your favourite song",
  "picker.title.multi": "Add songs",
  "picker.search": "Search songs",
  /** The search field's helper: what it looks in. */
  "picker.searchHint": "Japanese, English, Chinese or romaji",
  "picker.genre": "Genre",
  "picker.difficulty": "Difficulty",
  "picker.stars": "Stars",
  /** A filter menu's first choice, which takes every song. */
  "picker.all": "All",
  "picker.level": "★{level}",
  "picker.none": "No songs found.",
  "picker.loading": "Loading the song list…",
  "picker.failed": "The song list could not be loaded from taiko.wiki. Check your connection.",
  "picker.offeredReading": "Reading the songs Hiroba offers…",
  "picker.offeredFailed": "The songs Hiroba offers could not be read, so none can be picked yet.",
  /** Param: {max}, how many songs a set holds. */
  "picker.limit": "A set holds {max} songs at most. Remove one to add another.",
  "picker.close": "Close",
  /** The song search's way back out to the page under it. */
  "search.leave": "Close the search",
  "search.clear": "Clear",
  /** Param: {query}, a search kept on the device. */
  "search.forget": "Remove “{query}”",
  /** While the song search reads taiko.wiki's whole song list again. */
  "search.readingList": "Reading taiko.wiki's song list again…",
  "search.listRead": "taiko.wiki's song list was read again.",
  /** Under "nothing found" on a touch screen. Param: {seconds}, the long hold's. */
  "search.newSongPull":
    "A new song? Pull down and hold for {seconds} seconds to read taiko.wiki's song list again.",
  /** Under "nothing found" on a computer. Params: {button}, Read again's name; {seconds}. */
  "search.newSongHold":
    "A new song? Hold “{button}” for {seconds} seconds to read taiko.wiki's song list again.",
  "details.charts": "Charts",
  /** Param: {count}, the chart's most notes in a row. */
  "details.maxCombo": "Max combo: {count}",
  "details.branched": "Branched chart",
  "details.noPicture": "No picture of this chart yet.",
  /** Notes hit in each second over a song: 烈度 in Chinese, 密度 in Japanese. */
  "details.density": "Note density",
  /** Param: {value}, the most notes in one second. */
  "details.densityPeak": "Peak {value} hits/s",
  /** Params: {peak}, the most notes in one second, and {at}, when it comes, as m:ss. */
  "details.densityLine": "Notes in each second over the song, peaking at {peak} hits/s at {at}",
  "details.densityReading": "Reading the chart…",
  "details.noDensity": "No note density for this chart.",
  "details.densityFailed": "Could not read this song's chart.",
  "details.readDensity": "Read the chart again",
  /** Param: {value}, the chart's notes over its length, two decimals. */
  "details.averageDensity": "Average {value} hits/s",
  "details.branch": "Branch",
  "details.branch.normal": "Normal",
  "details.branch.advanced": "Professional",
  "details.branch.master": "Master",
  "details.pictureFailed": "Couldn't load the chart picture.",
  /** Params: {difficulty} (a difficulty.* text), {n} and {count}. A chart picture's name. */
  "details.picture": "{difficulty} chart, picture {n} of {count}",
  "details.drawnPicture": "{difficulty} chart, drawn from its TJA file",
  "details.noTja": "TJA Renderer cannot draw this chart, so taiko.wiki's pictures are shown.",
  "details.noCdn": "ABTH CDN has no drawing of this chart, so taiko.wiki's pictures are shown.",
  "details.chartDiffers": "This chart differs from the game's.",
  "gameSettings.reading": "Reading your game settings from Hiroba…",
  "gameSettings.profile": "Profile",
  "gameSettings.display": "Score panel and Dan-i",
  "gameSettings.playOptions": "Default play options",
  "gameSettings.songSelect": "Song select",
  /** The game's むずかしさからえらぶ folder, which these settings fill. */
  "gameSettings.byDifficulty": "Choose by difficulty",
  "gameSettings.region": "Region",
  "gameSettings.region.JPN": "Japan",
  "gameSettings.region.TWN": "Taiwan",
  "gameSettings.region.KOR": "South Korea",
  "gameSettings.region.MYS": "Malaysia",
  "gameSettings.region.HKG": "Hong Kong",
  "gameSettings.region.MAC": "Macau",
  "gameSettings.region.SGP": "Singapore",
  "gameSettings.region.AUS": "Australia",
  "gameSettings.region.NZL": "New Zealand",
  "gameSettings.region.VNM": "Vietnam",
  "gameSettings.region.IND": "India",
  "gameSettings.region.IDN": "Indonesia",
  "gameSettings.region.THA": "Thailand",
  "gameSettings.region.PHL": "Philippines",
  "gameSettings.region.KHM": "Cambodia",
  "gameSettings.region.BRN": "Brunei",
  "gameSettings.region.LKA": "Sri Lanka",
  "gameSettings.region.MMR": "Myanmar",
  "gameSettings.region.USA": "North America",
  "gameSettings.visibility": "Profile shown to",
  "gameSettings.everyone": "Everyone",
  "gameSettings.friendsOnly": "Friends only",
  "gameSettings.scoresDifficulty": "Score panel difficulty",
  "gameSettings.oniAndUra": "Extreme + Extreme (Ura)",
  "gameSettings.danShown": "Dan-i",
  "gameSettings.shown": "Shown",
  "gameSettings.hidden": "Hidden",
  "gameSettings.speed": "Speed",
  /** Param: {speed}, the speed option's multiplier, one decimal. */
  "gameSettings.speedValue": "×{speed}",
  "gameSettings.off": "Off",
  "gameSettings.on": "On",
  "gameSettings.random": "Random",
  "gameSettings.skip": "Song skip",
  "gameSettings.notePosition": "Note position",
  /** Param: {n}, how many steps the notes stand left of where they would. */
  "gameSettings.left": "Left {n}",
  /** Param: {n}, how many steps the notes stand right of where they would. */
  "gameSettings.right": "Right {n}",
  "gameSettings.voice": "Voice",
  "gameSettings.voiceOn": "On",
  "gameSettings.voiceOff": "Off",
  "gameSettings.tone": "Drum sound",
  "gameSettings.doubleCharts": "Double Play charts",
  "gameSettings.doubleChartsLocked":
    "Hiroba takes no change to this while you are in a competition or challenge with Double Play charts.",
  "gameSettings.folderDifficulty": "Difficulty",
  "gameSettings.folderStars": "Star level",
  "gameSettings.folderOrder": "Order",
  "gameSettings.notSet": "Not set",
  "gameSettings.eachTime": "Each time in the game",
  "gameSettings.usualOrder": "Usual order",
  "gameSettings.notClearedFirst": "Not cleared first",
  "gameSettings.noFullComboFirst": "No Full Combo first",
  "gameSettings.noDonderfulFirst": "No Donderful Combo first",
} as const satisfies Readonly<Record<string, string>>;
