# @abth/gui

The app of A Better Taiko Hiroba: one React and Material UI web bundle in two shells, Electron on
Windows and macOS, Capacitor on Android and iOS. It reads and changes the player's own data on
Donder Hiroba through `@abth/core`, and keeps what it read on the device. What the app does is in
the [repository's README](../README.md); this file says how to build, run, test and release it.

The app id is `com.hicirtech.taikohiroba` on every platform. Debug builds are
`com.hicirtech.taikohiroba.debug`, labelled "A Better Taiko Hiroba (debug)", so a debug and a release
build can sit on one device side by side.

## What you need

- **Bun 1.4.2.** It installs packages, runs every script, bundles Electron's code and runs Vite.
- **Node 22.** Only the Capacitor CLI and Storybook need it.
- **JDK 21**, with `JAVA_HOME` set, and the **Android SDK** with platform 36 and build-tools 36,
  with `ANDROID_HOME` set. Only the Android scripts need them.
- **adb** on the `PATH`, for a device.

Run `bun install` at the repository root. Bun does not run Electron's install script, so fetch the
Electron binary once:

```bash
bun node_modules/electron/install.js
```

Run every `bun run` script below from the repository's root; other commands, and the paths in this
file, are relative to this folder. `bun run check` runs the checks of CI side by side, all but the
GUI bundle: format, lint, typecheck, the tests and the update feed.

## The code

`src` is the web bundle, in layers: a folder imports only from the layers below it, which
`test/layers.test.ts` checks.

| Layer | Folders |
|---|---|
| Code kept from elsewhere | `vendor` (TJA Renderer, under its own licence) |
| Shared logic, types and hooks | `shared` |
| Hiroba's session: its services, reads, writes and pictures, and what it keeps | `hiroba-session` |
| Each shell's own parts | `platform` |
| The look | `theme` |
| Shared components, and the lane Hiroba's pictures come through | `ui`, `pictures` |
| Parts several pages draw | `songs`, `profile`, `snapshots` |
| A page or a feature each | `favorites`, `game-settings`, `know-yourself`, `my-page`, `name-title`, `navigation`, `pipelines-page`, `rating`, `read-again`, `scan`, `scores`, `settings`, `song-search`, `updates` |
| Every page, in one registry | `pages` |
| The window | `app`, then `App.tsx`, `app-window.tsx`, `shell.tsx` and `main.tsx` |

`story-kit`, what the stories share, stands above every layer.

Beside `src`:

- `electron`: the desktop shell, its main process, preload and window;
- `android` and `ios`: the Capacitor projects;
- `scripts`: the local stand-in for Hiroba and the other sites (`mock-*.ts`), the end-to-end run
  (`e2e`), the build scripts and ABTH CDN's generator (`abth-cdn`);
- `test` and `test-dom`: the unit tests (see [Testing](#testing));
- `.storybook`: Storybook's configuration (see [Storybook](#storybook)).

## Running it

### On a computer

| Script | What it does |
|---|---|
| `bun run dev` | Starts the local stand-in for Hiroba (`scripts/mock-hiroba.ts`), Vite's dev server and Electron. Nothing reaches the real sites, and the app keeps its data in `out/dev-user-data`, never in the installed app's folder: a session or costume history kept there is neither sent to the stand-in nor cleared or overwritten by it. |
| `bun run dev -- --real` | The same against the real Hiroba and Bandai Namco ID, in the installed app's data folder, `%APPDATA%\A Better Taiko Hiroba`. Only for a person signing in with their own account. |
| `bun run build` | The web bundle (`out/web`) and Electron's main process and preload (`out/electron`). CI runs this. |
| `bun run start` | Runs the last build in Electron. |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app. `ABTH_DEV_IMG_ORIGIN` adds the stand-in's picture host, which `bun run dev` and
the end-to-end run set; without it no picture host is asked anything, and set alone it stops the app.

### On Android

| Script | What it does |
|---|---|
| `bun run android:apk` | Web build, `cap sync`, debug APK. |
| `bun run android:run -- <adb serial>` | The same, then installs and starts it on that device. |
| `bun run android:live -- <adb serial> <LAN IP>` | Vite's dev server on this computer, and the debug app loading it with live reload. It runs only against the stand-in, and refuses to start unless both `VITE_ABTH_DEV_HIROBA_ORIGIN` and `VITE_ABTH_DEV_IDP_HOST` are set; `VITE_ABTH_DEV_IMG_ORIGIN`, the stand-in's picture host, is optional. |
| `bun run android:release` | Web build, `cap sync`, release APK. It is signed when the four `RELEASE_*` variables of [the signing secrets](#setting-up-the-signing-secrets) are set, and unsigned otherwise, which no device installs. |

The debug APK is signed with Gradle's own debug key, which each computer makes for itself. Android
updates an installed app only from an APK with the same key, so uninstall it before installing a
debug APK built on another computer.

To run the debug app against the stand-in on a device, start the stand-in on this computer's LAN
address first:

```bash
ABTH_MOCK_IP=<LAN IP> bun scripts/mock-hiroba.ts
VITE_ABTH_DEV_HIROBA_ORIGIN=http://hiroba.<LAN IP>.sslip.io:8807 \
VITE_ABTH_DEV_IDP_HOST=id.<LAN IP>.sslip.io:8808 \
VITE_ABTH_DEV_IMG_ORIGIN=http://img.<LAN IP>.sslip.io:8807 \
bun run android:live -- <adb serial> <LAN IP>
```

After a live session, run `bunx cap sync android` so the app loads its own bundle again.

On Windows, the `NoDefaultCurrentDirectoryInExePath` setting stops `cmd.exe` finding `gradlew` in
the current folder, which is how Capacitor starts Gradle. `scripts/android.ts` removes it from every
command it starts, so use the scripts rather than a bare `bunx cap run`.

### On iOS

On a Mac with Xcode 26 or later:

| Script | What it does |
|---|---|
| `bun run ios:build` | Web build, `cap sync`, an unsigned build for a device. CI runs this. |
| `bun run ios:ipa` | Web build, `cap sync`, an unsigned release build for a device, packed as `release/ABTH-<version>.ipa`. The release workflow runs this. |
| `bun run ios:source` | Writes `release/altstore.json`, the AltStore and SideStore source that lists this version's IPA. The release workflow runs this after `ios:ipa`. |
| `bun run ios:run -- <simulator id>` | Web build, `cap sync`, then builds, installs and starts it on that simulator. |
| `bun run ios:live -- <simulator id> [host]` | Vite's dev server on this Mac, and the debug app loading it with live reload. It runs only against the stand-in, like `android:live`. |

The debug build has its own id and name, and may reach the stand-in's `sslip.io` hosts over plain HTTP.

No one signs the IPA: whoever installs it signs it with their own Apple account, as [Installing on
iOS](../README.md#installing-on-ios) says.

### Environment variables

Only an unpackaged build reads them: a packaged one uses the real sites, whatever they say.
`bun run dev` and the end-to-end run set them. Android's live reload reads the same names with
`VITE_` in front, where the table says so.

| Variable | Read by | What it does |
|---|---|---|
| `ABTH_DEV_HIROBA_ORIGIN`, `ABTH_DEV_IDP_HOST` | desktop, Android | Hiroba and the Bandai Namco ID host: the stand-in. One without the other stops the app. |
| `ABTH_DEV_IMG_ORIGIN` | desktop, Android | The stand-in's picture host. Without it no picture host is asked anything; set alone, it stops the app. |
| `ABTH_DEV_REFUSING_HOST` | desktop, Android | A host that refuses a sign-in inside an app, as Google does. |
| `ABTH_DEV_SONG_CATALOGUE`, `ABTH_DEV_CHINESE_NAMES` | desktop, Android | Where taiko.wiki's song list and the songs' Chinese names are read. |
| `ABTH_DEV_RATING_DATA`, `ABTH_DEV_RATING_DATA_V2` | desktop, Android | Where the data of OurTaiko's two ratings is read. |
| `ABTH_DEV_ESE_MAPPING`, `ABTH_DEV_ESE_CHARTS` | desktop, Android | Where ESE's mapping of songs and its chart files are read. |
| `ABTH_DEV_ABTH_CDN` | desktop, Android | Where ABTH CDN's drawn charts and note densities are read. |
| `ABTH_DEV_CHART_ORIGIN` | desktop, Android | One more origin chart pictures may come from: the stand-in's. |
| `ABTH_DEV_UPDATE_FEED` | desktop, Android | The update feed. Without it an unpackaged build reads no feed, and so never asks GitHub. |
| `ABTH_DEV_USER_DATA` | desktop | The data folder, in place of the installed app's. |
| `ABTH_DEV_SERVER_URL` | desktop | Vite's dev server, which the window loads from. |
| `ABTH_DEV_NOW` | desktop | An ISO time that the check for Hiroba's daily maintenance takes as now. |
| `ABTH_DEV_OFF_SCREEN` | desktop | `1` opens the windows off every display at their full size, out of the taskbar and unfocused, and keeps them there. |
| `ABTH_DEV_PICTURES_FOLDER` | desktop | Where Save picture puts a page's picture, without the save box asking. |
| `ABTH_DEBUG_SAVE_READS` | desktop, packaged too | `1` keeps each page a read brings back (see [How it talks to Hiroba](#how-it-talks-to-hiroba)). |
| `ABTH_MOCK_IP`, `ABTH_MOCK_HIROBA_PORT`, `ABTH_MOCK_IDP_PORT` | the stand-in | The address and the two ports it listens on: `127.0.0.1`, 8807 and 8808 unless set. |
| `ABTH_E2E_LANE` | the end-to-end run | Set by the run for each lane, which takes ports and a data folder of its own. |
| `ABTH_STORY_PACK` | Storybook | Set by `--pack` alone (see [Storybook](#storybook)). |

## Testing

Each check `bun run check` runs also runs alone, from the repository's root: `bun run format:check`,
`bun run lint`, `bun run typecheck`, `bun test` and `bun run check:update-feed`.

`bun test` runs every unit test: `core/test`, `i18n/test`, and here `test` and `test-dom`.

- `test` holds the tests that need no page. It is typechecked with no DOM and no JSX, so a test there
  may import only modules whose whole import graph, type-only imports included, holds no `.tsx` file
  and no DOM global, and none that loads `electron` as it starts.
- `test-dom` holds the tests that render React. Each file calls `inADocument()` first, which
  registers happy-dom for that file, and takes Testing Library from `@testing-library/react/pure`.
- Hiroba's pages appear in tests only as hand-written excerpts, as `core/test/README.md` says.

### The end-to-end run

`bun run e2e` builds the app, drives it against the local stand-in (nothing reaches the real sites)
and prints a JSON report with one key per check. Its sections run in lanes side by side, each lane
with an app, a stand-in, ports and a data folder of its own (each section's `lane`); `--serial` runs
them one after another in one app. `--only <section,...>` runs just those sections (named in
`scripts/e2e/sections.ts`), and `--no-build` skips the build, to fix one check without the whole run.

A pass has no `errors` entry and every key `true`, except `tokenInRendererDom` and
`partitionsFolder` (`false`), `readsAfterSignIn`, `readsAfterReadAgain` and `readsOnReopen` (`1`,
`3` and `1`) and `userDataHits` (empty); `scripts/e2e/verdict.ts` holds that list, and the run exits
with an error when a check misses it. `surface`, `longHoldPresses`, `setupMs` (the build), `laneMs`
(each lane's time) and `sectionMs` (each section's) only inform.

The app's windows open off every display, out of the taskbar and unfocused, so the computer stays in
use during a run; `--show` opens them on screen to watch. Each page is held at 946×738, so a display
that sleeps or goes, and moves or shrinks the windows, leaves the layout as it was, and a lane
refuses to start while its ports are taken, as an earlier run's apps still hold them. A window shown
may be covered, since the run stops Chromium counting a covered window as hidden, but not minimised:
a hidden page asks for no picture.

### Storybook

| Script | What it does |
|---|---|
| `bun run storybook` | Storybook on `http://localhost:6006`: stories for every component in `src`, from a chip to a whole page. |
| `bun run storybook --pack <folder>` | The same, drawing the pictures of a resource pack kept outside the repository. |
| `bun run build:storybook` | The same as a static site in `out/storybook`, always with the stand-ins. |

The stories draw made-up data and the stand-in's pictures (`scripts/mock-pictures.ts`), and ask
nothing of Hiroba or any other site; a whole page runs on a port that answers from the same data.
The toolbar picks the device (the PC's window as it opens, or an Android phone or tablet, both touch
screens), the language and light or dark. The sidebar groups the components by kind, and each kind
opens with its members side by side.

A resource pack is a folder, outside every git work tree, named by its absolute path. Its
`pack.json` lists PNG files below it by the keys the picture lane uses (`wantKey` in
`src/pictures/picture-lane.ts`), plus `danLabel/<board>` for a dan's label and
`chartPicture/<song>/<difficulty>/<n>` for a chart's pictures, and JSON files by the names in
`src/story-kit/pack.ts`: each is what the port answers for a page, or a feed's own text.

```json
{
  "format": "abth-story-pack",
  "version": 1,
  "label": "my pack",
  "pictures": { "rankIcon/5": "pictures/rankIcon/5.png", "danLabel/10": "pictures/danLabel/10.png" },
  "data": { "recentPlays": "data/recentPlays.json" }
}
```

Whole pages read the pack's data and the components keep the made-up data; anything the pack lacks
keeps its stand-in. The repository ships no pack, only the local Storybook reads one, it then
answers this machine alone, and a build refuses to start while a pack is named.

## How it talks to Hiroba

Every read of Hiroba goes through one queue, on both platforms, a picture's fetch included. Up to
five reads run at once, and pictures go five at a time in screen order. A write waits for the
running reads to end, goes before the reads still waiting and holds the queue for all its requests,
so no read and no picture lands between them; a second write asked for meanwhile is answered busy.
The play history is read beside the queue, in a pipeline of its own, up to three pages at once and
during a write too: its pages carry no form token. When the session ends, the queue stops: a read or
a write that is running sends nothing after the request on its way, and one still waiting sends
nothing.

Read again first asks Hiroba to refresh its copy of the play from the game server, as the ↻ on
Hiroba's own pages does: my page is read for a fresh form token and the ↻'s post sent once, alone in
the queue. The read after a sign-in or at a launch does not ask for one.

Every write goes through core's `runWrite`, and every write is open in every build. It reads the
editor for a fresh form token and the whole set, sends the pre-check (a rename and the game settings
have none), sends the save exactly once, and reads the whole set back: the set read back decides the
outcome, not Hiroba's answer. No request is retried, and no post goes out between 05:00 and 07:00
JST, Hiroba's daily maintenance: the clock is looked at before a write starts and again just before
each post.

A kind of write that has not been made for real from a platform also reads one other page before and
after, to see that nothing else moved. `LIVE_CHECKED_WRITES` in
`src/hiroba-session/live-checked-writes.ts` lists, for each platform, the kinds that have; it decides
those two reads and nothing else.

On Android a write goes over Capacitor's HTTP client. A post is one native call, with its form
encoded in the order the page's form holds it; a 301, 302 or 303 is followed in the app with one GET
that has no body, as the desktop does, and a 307 or 308 is handed back unfollowed. The WebView's
cookie store is written to disk after each write.

`ABTH_DEBUG_SAVE_READS=1` makes the desktop app, a packaged one too, keep each page a read brings
back in the data folder's `debug` folder, named after the page, with every form token replaced by
`<tckt>`. Every answer is also kept in `debug\history`, in the order it came and with its time; of a
post, only Hiroba's answer is kept, never the form the app sent. The folder holds the player's
nickname, taiko number and title: keep it to yourself, and delete it when you are done.

## Where data lives

### The session

Hiroba's session is one cookie, `_token_v2`. No code in the interface ever holds its value.

**Desktop.** The sign-in window runs on an in-memory browser session, new for every attempt and
cleared when the window closes. It opens any https page the sign-in passes through, such as the
sign-in of another account Bandai Namco ID offers, and the popups such pages open, on that same
session and each titled with the host it is on; a page that is not https ends the attempt. A
service known to refuse a sign-in inside an app (Google) is never loaded: the attempt ends, and
Hiroba's sign-in page opens in the system's browser, where a mail address and password can be
added to the Bandai Namco ID once, for signing in here. The cookie is held in the main process,
and kept on disk, in plain text, in `session.json` in the app's data folder
(`%APPDATA%\A Better Taiko Hiroba`), so you stay signed in across launches until you sign out or
Hiroba ends the session. Signing out, or a read or write that finds the session gone, deletes the
file.

**Android.** The sign-in runs in the in-app browser, which shares the app's WebView cookie store,
and Capacitor's native HTTP client reads Hiroba through that same store. A service known to refuse
a sign-in inside an app is closed as soon as its page has loaded, and the system's browser opens
as on the desktop. The store is kept across launches, so you stay signed in there too. The app
wipes every cookie when a sign-in starts, when one is cancelled, ends at such a service or cannot
open, at sign-out, and when a read finds the session gone. Between a sign-in and the next
sign-out, the app's private storage holds:

- `_token_v2`, in plain text, in the WebView cookie database (`app_webview/Default/Cookies`);
- the Bandai Namco ID host's Domain cookies (its host-only cookies are cleared after sign-in);
- the WebView's HTTP cache, which is cleared when the next sign-in browser opens;
- web storage of donderhiroba.jp and bandainamcoid.com, which the app cannot clear.

This is an accepted exception to the rule that the session is never stored in plain text. The app
turns off Android backup and device transfer for all of its data, so none of it leaves the device
that way.

### Pictures

Each of Hiroba's pictures the app shows, an item's thumbnail, the score panel's art, a legend's or a
difficulty's icon, your title plate or your どんメダル plate, is fetched once and kept on the device
for good, since arcades often have poor networks. Your My Don is kept too, the last one fetched, and
fetched anew once after each read of your page but a session's first, and after a costume write.
Signing out deletes none of them, and neither does the next sign-in, though the card lets go of
those it showed and takes them from the device again, so it never shows the last player's while the
next one's come. Thumbnails, the panel's art and the icons show no player and are kept for any
account on the device; a plate is kept under its player, so no other account is given it. Only the
checked PNG bytes are kept, under SHA-256 names: no URL, header, cookie, taiko number, title or
medal id.

- **Desktop:** one file per picture in `pictures` in the app's data folder:
  `v1\shared\<hash>.png` for a thumbnail, the panel's art or an icon, `v1\player\<hash>\<hash>.png` for a
  plate or the portrait.
- **Android:** the app page's IndexedDB, `abth-pictures`, under the same names. The system may drop
  it when storage runs short, which costs only fetches. Live reload loads the page from another
  origin, so a run against the stand-in keeps its pictures and its costume and folder histories
  (`abth-costume-history`, `abth-folder-history`), each in a database of its own that no
  `PICTURE_EPOCH` clears, apart from the installed build's.

The pictures of charts, from off Hiroba, are kept the same way, as checked PNG, JPEG, WebP or GIF bytes
under hashed names, but apart: in `charts` beside `pictures` on the desktop, and in the IndexedDB
`abth-charts` on Android.

Nothing in the app deletes a picture but a new `PICTURE_EPOCH` in
`src/shared/picture-store.ts`: the next launch clears whatever an older one kept. To clear
them by hand, delete the `pictures` folder, or clear the Android app's data.

### Everything else

| What | Desktop: in the data folder | Android: IndexedDB |
|---|---|---|
| Scores, for each player | `scores.json` | `abth-scores` |
| Recent plays | `recent-plays.json` | `abth-recent-plays` |
| Score changes | `score-changes-2.json` | `abth-score-changes-2` |
| Rating history | `rating-history.json` | `abth-rating-history` |
| Costume history | `costume-history.json` | `abth-costume-history` |
| Favourites folder history | `folder-history.json` | `abth-folder-history` |
| What the pipelines did | `pipelines` | `abth-pipelines` |
| Note densities | `densities` | `abth-densities` |
| Charts drawn on the device | `drawn-charts` | `abth-drawn-charts` |

`src/hiroba-session/kept-things.ts` describes each kind kept for a player: its file, its database,
table and record field, and the names it had before. `electron/data-folder.ts` names the data
folder's other files and folders. Renaming one loses data. A kind whose shape changes is kept under
a new name and read from the old one until its first save, and the old one stays as it was, as
builds already released still write it (score changes were `score-changes.json` and
`abth-score-changes`).

Data that does not read is never written over: a save first keeps it aside, as
`<name>.unreadable.json` beside the file on the desktop, and as the record
`<taiko number>.unreadable` on Android.

The page's own storage (`localStorage`) holds, on both platforms:

- the settings: `abth.locale`, `abth.theme`, `abth.themeMode`, `abth.shownDifficulty`,
  `abth.scoresSort`, `abth.chartSource` and `abth.ratingSystem`;
- the page last shown, `abth.page`, the song searches, `abth.songSearches`, and the tips seen,
  `abth.tipsSeen`;
- the favourite sets, `abth.favoriteSets`, with sets that do not read kept aside in
  `abth.favoriteSets.unreadable`;
- when updates were last checked and told, `abth.update.checkedAt` and `abth.update.shown`;
- copies of what other sites answered: taiko.wiki's song list (`abth.songCatalogue`), the Chinese
  names (`abth.chineseNames`), the songs Hiroba's picker offers (`abth.pickableSongs`) and each
  rating's data (`abth.ratingData.<rating>`);
- on Android, whether the player signed in, `abth.signedIn`.

## Translations

The app's words are in `i18n`, one catalog for each of English, 日本語, 简体中文 and 繁體中文, which
reads as Hong Kong writes it. `i18n/src/messages/en.ts` is where the keys come from: a message's
English words name its parameters (`{name}`), and the type checker holds every other catalog to the
same keys and each call of `t` to the parameters its words name. A new message is one line in each
catalog, with its note above it in `en.ts`. Game terms are worded as taiko.wiki words them. What
Hiroba writes as data, such as a nickname, a title or a medal's name, is never translated, and an
element that holds only such words is marked `lang="ja"`.

## Building

| Script | What it does |
|---|---|
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable zip in `release/`, for x64: `ABTH-<version>-setup.exe` and `ABTH-<version>-portable.zip`. |
| `bun run dist:mac` | On a Mac only: a disk image per processor in `release/`, `ABTH-<version>-mac-arm64.dmg` for Apple silicon and `ABTH-<version>-mac-x64.dmg` for Intel, each app signed ad hoc. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in", and refuses to start at all while the packaged app keeps a session in `%APPDATA%\A Better Taiko Hiroba`, since the app would then read the real Hiroba by itself. |

The installer and the exe in the zip are not code-signed, so Windows SmartScreen warns before the
first run.

The macOS app has no Apple certificate and is not notarized, so macOS blocks its first start: drag
it from the disk image to Applications, open it once, then allow it under System Settings → Privacy
& Security → **Open Anyway**. It keeps its data in
`~/Library/Application Support/A Better Taiko Hiroba`, and keeps the menu bar's app and Edit menus,
through which a Mac copies, pastes and quits.

The zip needs no install: unzip it into a folder of its own (Explorer's **Extract All** makes one)
and run `A Better Taiko Hiroba.exe` in it. It starts faster than a self-extracting exe, which
unpacks itself at every launch. Like the installer's app, it keeps its data in
`%APPDATA%\A Better Taiko Hiroba`.

## Releases

Two workflows run on GitHub Actions. `.github/workflows/ci.yml` runs on a pull request to `main`, on
a push to `main`, and when started by hand. It has three jobs side by side: **Checks** (format, lint,
typecheck, the tests, the update feed and the GUI bundle), **Android debug APK**
(`bun run android:apk`, on the runner's Android SDK, with JDK 21 and Node 22) and **iOS app,
unsigned** (`bun run ios:build`, on macOS 26 with Node 22).
`.github/workflows/release.yml` builds and publishes a release; [Making a
release](#making-a-release) says what is done by hand.

### The version

`version` in `gui/package.json` is the one place a version is set; `gui/update.json` repeats it for
the update reminder, and CI fails when the two differ. A version is
`MAJOR.MINOR.PATCH`, and the tag is `v` and the version: `v0.1.0`. electron-builder names the
Windows files from it, and `android/app/build.gradle` reads it too: `versionName` is the same text,
and `versionCode` is `major * 10000 + minor * 100 + patch`, so 0.1.0 is 100 and 1.2.3 is 10203.
Android updates an app only to a higher code, so minor and patch stop at 99 (one more would spill
into the next place, and a later version could get a lower or an equal code), and the code stops at
Android's own limit, 2100000000. A version has no `v`, no pre-release part and no build part. The
Gradle script refuses a version that breaks these rules, so the Android build fails on one.
`scripts/ios.ts` gives the IPA the same text as its version and its build number.

### Making a release

A release takes two steps by hand, and the workflow below does the rest.

1. Raise the version in a pull request. In a branch, set `version` in `gui/package.json` and
   run `bun install`, so that `bun.lock`, which states each workspace's version too, follows. Set
   `version` and `notes` in `gui/update.json` as well: the notes are a list of lines for each of
   `en`, `ja`, `zh-Hans` and `zh-Hant` (any of them), and are what the app's update dialog shows.
   Commit them as `chore(release): bump to <version>`, open a pull request, and merge it.
2. Tag the merge commit and push the tag. On an up-to-date `main`:

   ```bash
   git switch main && git pull
   git tag -a v<version> -m "A Better Taiko Hiroba <version>"
   git push origin v<version>
   ```

   `git tag` tags the commit that is checked out, which is the merge commit while nothing has landed
   after it; give a commit's hash after the message to tag another.

The tag starts the release. If it is not `v` plus the version that `gui/package.json` states at
the tagged commit, or `gui/update.json` is not valid or states another version, the workflow stops
the run before anything is built. `bun run check:update-feed` makes the same check.

### What the workflow builds

`.github/workflows/release.yml` runs when a tag `v*.*.*` is pushed: that is a release. It also runs
as a **dry run**, which builds the same files, keeps them and creates no release: when started by
hand (**Run workflow** in the Actions tab), and on a pull request to `main` that touches what a
release is made of, which is the workflow itself, `gui/package.json` (which also holds
electron-builder's configuration, under `build`), `gui/update.json`, `gui/android/**` and
`gui/ios/**`.

A **Version** job reads the version first, checks `gui/update.json` against it, and on a tag run
stops the run unless the tag is `v` and that version. Then four jobs run side by side, none
waiting on another:

| Job | Runs on | Makes |
|---|---|---|
| **Android release APK** | Ubuntu 26.04, JDK 21 | `ABTH-<version>.apk`, signed with the release key from [the signing secrets](#setting-up-the-signing-secrets). |
| **Windows installer and zip** | windows-latest | `ABTH-<version>-setup.exe`, the NSIS installer, and `ABTH-<version>-portable.zip`, the build that needs no install ([Building](#building) says how to run it). Both are x64 and not code-signed. |
| **macOS disk images** | macos-latest | `ABTH-<version>-mac-arm64.dmg` for Apple silicon and `ABTH-<version>-mac-x64.dmg` for Intel Macs. Each app is signed ad hoc, with no Apple certificate, and is not notarized ([Building](#building) says how to open it). |
| **iOS IPA, unsigned** | macos-26 | `ABTH-<version>.ipa`, a release build for a device that no one signs ([On iOS](#on-ios) says how to install it), and `altstore.json`, the source AltStore and SideStore read it from. |

Each uploads its files as an artifact of the run (**android**, **windows**, **mac** and **ios**, kept
for 14 days). On a tag, a **Release** job then runs after all four. It downloads the artifacts and
runs `gh release create v<version> --title "A Better Taiko Hiroba <version>" --generate-notes` with
the seven files and `gui/update.json` (the release's asset `update.json`, which the app reads), as
`GITHUB_TOKEN` with `contents: write`; the notes list the pull requests merged since the last
release. **The release is published, not a draft**: its files are public as soon as that
job ends. A dry run never reaches that job.

If a job fails, nothing is published and the tag stays. Fix the cause and **Re-run failed jobs** on
the run (that is also how to carry on once a missing secret is added), or, to release again from
another commit, delete the tag first: `git push origin :refs/tags/v<version>` and
`git tag -d v<version>`.

Without the signing secrets a dry run builds `ABTH-<version>-unsigned.apk` instead of failing: an
APK that no device installs, which shows the release build compiles. A tag run without them fails
at once, and names the missing ones.

### Setting up the signing secrets

The workflow signs the APK with a release key kept in four repository secrets:

| Secret | Holds |
|---|---|
| `RELEASE_KEYSTORE_B64` | The keystore file (`.jks`), in base64. |
| `RELEASE_KEYSTORE_PASSWORD` | The keystore's password. |
| `RELEASE_KEY_ALIAS` | The alias of the key in the keystore. |
| `RELEASE_KEY_PASSWORD` | The key's password. |

At run time the workflow decodes the keystore into the runner's temporary directory and gives the
build the keystore's path and password and the key's alias and password, as
`RELEASE_KEYSTORE_FILE`, `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS` and
`RELEASE_KEY_PASSWORD`. It prints none of them. `android/app/build.gradle` reads them, and signs the
release build exactly when `RELEASE_KEYSTORE_FILE` is set.

Set the secrets once from inside the clone, in a shell with `base64` and the GitHub CLI signed in.
`gh secret set` takes a value from a pipe or asks for it, so nothing is printed or kept in the
shell's history:

```bash
base64 -w0 <your keystore> | gh secret set RELEASE_KEYSTORE_B64
gh secret set RELEASE_KEYSTORE_PASSWORD
gh secret set RELEASE_KEY_ALIAS
gh secret set RELEASE_KEY_PASSWORD
gh secret list
```

`gh secret list` shows the four names, never the values, and no secret can be read back, so keep the
keystore backed up elsewhere: an app signed with another key cannot update the installed one.

## Signing in for real

Debug builds let any computer paired with the device over adb open the app's WebViews in DevTools
and read its files with `run-as`. So:

- Sign in with a real account on the signed release APK that a published release carries, or on the
  debug APK. On Windows, use the installer's app or the portable zip's.
- Turn wireless debugging off before a real sign-in on a debug build, and never run `run-as` or
  DevTools against the app while a real session exists on the device.
- Uninstall the debug build, or clear its data, once you are done with it.

Automated checks never press "Sign in" against the real sites: not in a packaged build, not under
`dev -- --real`, not on a release APK and not on the debug APK. The end-to-end run and the smoke
test use the stand-in or stop at the first screen.
