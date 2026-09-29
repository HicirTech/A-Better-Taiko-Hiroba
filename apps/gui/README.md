# @abth/gui

The desktop and Android app of A Better Taiko Hiroba. One React and Material UI web bundle runs in
two shells: Electron on Windows, Capacitor on Android. It signs in to Donder Hiroba on Hiroba's own
pages and reads your own page: one request per read, and one more for your dan label when the page
shows one, since the page gives the dan only as that picture. The Overview opens as your page's
header does: your マイどん as Hiroba draws it, beside your nickname, title and dan on Hiroba's own
title plate and dan label, and under them Hiroba's score panel, its ten counts written over its art.
Under that come the seven score ranks and the three crowns again, each block as one bar of shares
with a legend of percents, like GitHub's "Languages" box (the counts are in each item's tooltip);
the season's どんメダル on Hiroba's own plate, and your favourite songs. On the desktop it can also change your costume (きせかえ), but only in a development run
opened for it, until the first real write has been made and recorded (see
[The first real costume write](#the-first-real-costume-write)).

The window has no header. On a wide window a side panel, like Gmail's, lists its three pages:
**Overview** (the identity card with the score panel, the shares and the どんメダル),
**Favourites** (the 大好きな曲 and the お気に入り folder) and **Settings** (the language, and
signing out). On a narrow one, a menu button
at the top left opens the same list in a drawer. On Android, Back closes the drawer, goes from
Favourites or Settings back to the Overview, and from the Overview leaves the app as before.
Every page keeps room for the scrollbar, so the page does not shift sideways from page to page.
The app is light or dark as the system is (Windows' app mode, Android's dark theme), and the
page's `color-scheme` follows, so its scrollbars and the system's own widgets do too.
The app opens on the page last shown on the device;
signed out, the Overview and Favourites show the sign-in card, and Settings still works.

Signed in, the Overview and Favourites read your page again from a small round **Read again**
button with a refresh arrow at the top right, which stays there as the page scrolls. It spins
while a read runs, and it is shut then, and while the costume editor is open or an undo runs, so
one read runs at a time and none inside a write. On a touch-first screen (`pointer: coarse`), pull
the page down from its top instead: a round indicator follows the finger, and letting go once its
ring is full reads again. There the button is drawn only when the keyboard's focus is on it, and it
stays for screen readers. The line under the page still says when it was read.

The app id is `com.hicirtech.taikohiroba` on both platforms. Android debug builds are
`com.hicirtech.taikohiroba.debug`, labelled "A Better Taiko Hiroba (debug)", so a debug and a release
build can sit on one device side by side.

## Languages

The app is in English, 日本語, 简体中文 and 繁體中文. Until you pick one, it opens in the first of the
system's languages it carries, as `navigator.languages` lists them (on the desktop, Electron's
locale first, then the system's list); zh-HK, zh-TW and zh-MO read as Traditional Chinese, any other
Chinese as Simplified, and English is the fallback. The language setting in **Settings** changes
the language at once, asking Hiroba nothing, and keeps the pick on the device (the page's
localStorage) for the next launch, a pick of the language already shown included. Its **System
default** forgets the pick, so the app follows the system's language again, at once and at each
launch. Counts, percents and times follow the language through `Intl`, and the page's `lang`
names it, so the system picks fonts for it. Hiroba's own words stay as Hiroba writes them in
every language: rank names, costume parts, どんメダル, マイどん, dan names, titles and item names. An element that holds only such words (a rank name,
the nickname, the title, a costume part's tab) is marked `lang="ja"`, so it keeps Japanese glyphs
and a screen reader's Japanese voice; a sentence that only quotes them keeps the app's language.
The catalogs are in `packages/i18n`; the type checker and the tests hold each to every English key
and its parameters.

## What you need

- **Bun 1.4.2.** It installs packages, runs every script, bundles Electron's code and runs Vite.
- **Node 22.** Only the Capacitor CLI needs it.
- **JDK 21**, with `JAVA_HOME` set, and the **Android SDK** with platform 36 and build-tools 36,
  with `ANDROID_HOME` set. Only the Android scripts need them.
- **adb** on the `PATH`, for a device.

Run `bun install` at the repository root. Bun does not run Electron's install script, so fetch the
Electron binary once:

```bash
bun node_modules/electron/install.js
```

Run every script below from this folder, or from the root with `bun run --cwd apps/gui <script>`.

## Desktop

| Script | What it does |
|---|---|
| `bun run dev` | Starts the local stand-in for Hiroba (`scripts/mock-hiroba.ts`), Vite's dev server and Electron. Nothing reaches the real sites, and the app keeps its data in `out/dev-user-data`, never in the installed app's folder: a session or undo record kept there is neither sent to the stand-in nor cleared or overwritten by it. |
| `bun run dev -- --real` | The same against the real Hiroba and Bandai Namco ID, in the installed app's data folder, `%APPDATA%\A Better Taiko Hiroba`. Only for a person signing in with their own account. |
| `bun run build` | The web bundle (`out/web`) and Electron's main process and preload (`out/electron`). CI runs this. |
| `bun run start` | Runs the last build in Electron. |
| `bun run e2e:desktop` | Builds, then checks the pages (a side panel on a wide window, and on a narrow one a menu button whose drawer a pick, Escape or a tap outside closes; the sign-in card on the Overview and Favourites while signed out, the page shown kept for the next launch, and the page's column in one place on a page that scrolls, one that does not and under a menu), the scheme (dark or light as the system asks, the page's `color-scheme` with it), the language (opened on a system in Traditional Chinese, the app is in it; a pick in Settings, of the language shown or another, takes hold at once, is kept for the next launch, and redraws the profile as it was read, asking Hiroba nothing; System default follows the system again, at once and after a relaunch; Hiroba's own words on the profile and in the editor are marked Japanese), and drives sign-in, reading, reading again (from the small Fab, which is shut and spins while a read the stand-in holds runs, a second press sending nothing; on an emulated touch screen, by a pull from the top of the page past the point, not by a short, upward, sideways or lower one, the Fab then drawn only under the keyboard's focus, and a slow pull begun on the portrait opening no tooltip; and by neither while an undo waits on its pre-check), a rotated session, a lost session (the next sign-in shows none of its pictures), cancel and sign-out (in Settings) against the stand-in, with a dan read off its label and a label that does not read, the panel's counts of 0 (still listed, with no part of a bar), the Overview shaped like my page's header (the portrait beside the plate and the score panel, one under another on a narrow window, with no background art), the score panel (a plain stand-in while its art does not come, its counts as text where my page writes them, the art fetched once per device), and the identity card on its title plate (on the app's own surface, its words still text, one request per title, a plate that does not come, the plate kept across sign-outs and relaunches), the My Don portrait (from the picture host with no cookie, a first one that does not come, kept across relaunches and sign-ins, fetched anew after **Read again** and after a change or undo applies but not after a save that moves nothing, the kept one still shown when a fresh one does not come), and the どんメダル plate (asked for only once its card is on screen, its words still text over it, one request per season and per state, a plate that does not come, its id in neither the window nor any file but the debug copies, the plate kept across sign-outs and relaunches). With the write gate open, it checks the editor's picture of the set (shown on opening, redrawn after a pick, one request for a burst of picks, a picture that does not come, none once closed, and one asked for during a write waiting until the write is done) and its items' thumbnails (only the rows on screen and one ahead, each once, kept across sign-outs and relaunches, one that does not come, one the editor did not offer, shapes the bridge refuses, and one asked for during a write waiting until the write is done), then changes a colour and a きぐるみ and undoes each, and checks each write sent exactly the requests planned, that the Snackbar offers the undo only once the editor is closed and only on the Overview, and that pressing it twice sends one undo; it tries the #22 trap, a save that moves nothing, pre-checks that stop, a post sent to the login page, an undo after a change made elsewhere, a session that ends before and after a save, and Hiroba's daily break; it checks the portrait is the editor's button, with no **Change costume** button beside it, and shows its edit badge and name under the pointer; and reopened without the flag, it checks no write can be sent and that the portrait is no button and says why, in its tooltip too, under the pointer or a finger held on it. It then searches the app's data folder for anything the session left behind, and for every form token the stand-in handed out, and checks the pictures kept there are named by hashes alone. In the report it prints, every check is `true` except `tokenInRendererDom` and `partitionsFolder`, which are `false`; the my-page read counts are `1`, `2` and `1`; and `userDataHits` is empty. |
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable exe in `release/`. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in", and refuses to start at all while the packaged app keeps a session in `%APPDATA%\A Better Taiko Hiroba`, since the app would then read the real Hiroba by itself. |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app. `ABTH_DEV_IMG_ORIGIN` adds the stand-in's picture host, which `bun run dev` and
the end-to-end run set; without it no picture host is asked anything, and set alone it stops the app.

The installers are not code-signed, so Windows SmartScreen warns before the first run.

### Writes

The desktop app can change one thing on Hiroba so far: the costume. No kind of write has been
verified against the real site yet, so **no packaged build can send one**. A kind that is not
verified opens only in an unpackaged run started with `ABTH_UNVERIFIED_WRITES=1`; a packaged build
ignores that variable. Android sends no write at all for now. In a run that may not change the
costume, the My Don portrait opens nothing, and its tooltip (a long press on a touch screen, the
finger held still: a pull begun on it opens none) says it is not open in this build yet. Where the
costume may be changed, a click on the portrait opens the editor; a pointer on it, or the
keyboard's focus, shows a small edit badge.

Every write goes the same way: read the editor for a fresh form token and the whole set, keep an
undo record in `undo.json` in the app's data folder, send the pre-check, send the save exactly
once, and read the whole set back. The set read back decides the outcome, not Hiroba's answer.
While a kind is not verified, each write also reads your title on my page before and after. No
request is retried, and no post goes out between 05:00 and 07:00 JST, Hiroba's daily maintenance:
the clock is looked at before a write starts and again just before each post.

Two more variables apply to unpackaged runs only: `ABTH_DEV_NOW` (an ISO time) fixes the clock the
maintenance check uses, for tests, and `ABTH_DEBUG_SAVE_READS=1` keeps each page a read brings back
in the data folder's `debug` folder, named after the page, with every form token replaced by
`<tckt>`. Every answer is also kept in `debug\history`, in the order it came and with its
time, so a write can be followed step by step; of a post, only Hiroba's answer is kept, never the
form the app sent.

### The costume preview

The costume editor shows at its top Hiroba's own picture of the set as picked, as Hiroba's editor
does in its 今のきせかえセット box: `imgsrc_mydon.php` with the three colours and five slots in its
query. The platform fetches it with the session and hands the window a `data:` URL, so neither the
address nor the cookie reaches the window. It asks once when the editor opens, then once per pause
in the picks (300 ms), one request at a time and never retried, and nothing once the editor is
closed; a set already drawn in that opening is shown again without asking. It is a read, so no
write gate stands in front of it, and Android allows it too. A picture that does not come leaves
"Preview unavailable" and a code for a report; the editor works without it. With
`ABTH_DEBUG_SAVE_READS=1`, only the latest picture is kept, as `debug\imgsrc_mydon.php.png`, and
none in `debug\history`.

### Item thumbnails

Under **きせかえ**, each slot shows its items by Hiroba's own thumbnails, in a box like Hiroba's:
six to a row, four rows at a time, scrolled natively or a row at a time with ▲ and ▼, and はずす as
a button under it. Each thumbnail is `imgsrc_kisekae.php?cos=<id>&type=<slot>`. The platform builds
that address itself, only for an item the last editor read offered (one the account owns, or the
one it wears), fetches it with the session, checks that it is a PNG of a thumbnail's size, and
hands the window a `data:` URL. The window names an item by its slot and number, never by an
address.

What it costs Hiroba:

- Opening the editor costs no thumbnail: it opens on いろ.
- On the items tab, a thumbnail is asked for only once its cell has stayed in the box, or within a
  row of it, for 150 ms, so a fling past a row asks nothing. The first view of a slot asks for 30
  at most, and each row scrolled into view for six more.
- One at a time, after a random pause of up to 100 ms, in the queue with every other request to
  Hiroba, so never between a write's requests; none is asked for while a save or an undo runs.
  At most 300 in a run, and 8 s each on the desktop.
- Never retried within one opening of the editor. One that did not come is asked for once more the
  next time the editor is opened and its cell is seen, within the same 300: if Hiroba sends none,
  each opening asks again for those seen.
- Each is fetched once and kept on the device for good: opening the editor again, going back to a
  slot, signing in again or a relaunch asks Hiroba for nothing already shown. See
  [Where pictures are kept](#where-pictures-are-kept).

Hiroba's own editor, for comparison, asks for a whole tab of thumbnails (38 to 76) at once on every
tab click. A thumbnail that does not come leaves the item's number in its cell, and one line under
the box says how many did not, with a code for a report; the editor works as before. Android does
the same. With `ABTH_DEBUG_SAVE_READS=1`, only the latest thumbnail is kept, as
`debug\imgsrc_kisekae.php.png`, and none in `debug\history`; its `.json` counts how many came in
the run.

### The identity card

The card at the top is drawn as my page draws its header: your マイどん on the left; on the right
your title over Hiroba's own title plate, your nickname in its cream box and your dan's own label in
the blue one, and under the plate [the score panel](#the-score-panel). On a narrow window they
stack, the portrait first. All sit on the app's own surface rather than Hiroba's yellow, with no
background art. Your region is not shown. The words stay text over the pictures, and
the card keeps Hiroba's proportions at any width, up to half again its size. The label is the picture the read already fetches to read
your dan, so it costs nothing more. The plate is `imgsrc_titleplate.php` as your page writes it,
with no query: Hiroba draws it for whoever holds the session. The platform fetches it with the
session, only after a read of my page that shows one, checks that it is a PNG of a plate's size
from that address, and hands the window a `data:` URL. The window asks for "the title plate", and
nothing more.

What it costs Hiroba:

- One request per title. The plate is kept per player, under the title shown over it, so a read
  that finds the same title asks Hiroba for nothing once its plate has come, and a title changed
  anywhere, on Hiroba's own site too, costs one request after the next read.
- Asked for once the card is on screen after a read, one at a time in the queue with every other
  request, so never between a write's requests. Never retried: a plate that did not come is asked
  for once more after each read, and only then.
- Kept on the device for good, sign-outs and relaunches included, once a later read has found the
  session still good, and kept under your player, so never given to another account. Until then it
  is shown, not kept: a sign-out before that read asks for it again.

Until the plate comes, or if it does not, a plain band of the same shape stands in, and a line
under the card gives a code for a report. Without a session, Hiroba answers a blank plate, a PNG
that no check can tell from yours, which is why the plate is asked for only after a read that
found the session good, and kept only once the next read finds it good still: a blank plate that
came as Hiroba ended the session unseen is shown until that read at most, and never kept. With
`ABTH_DEBUG_SAVE_READS=1`, every plate is kept in `debug\history`.

### The score panel

Under the plate is Hiroba's score panel, drawn as my page draws it: the counts of the seven score
ranks and the three crowns written as text over its art, where my page writes them. The art is
`image/sp/640/total_score_image_<n>.png`; the platform takes `<n>` from the art your page shows,
and the window asks for "the score panel", and nothing more. The art shows no count and names no
player, so it is kept on the device for good for every account: fetched once, asked for only once
the panel is on screen, one at a time in the queue, and never again after it came, relaunches and
sign-outs included. Until it comes, if it does not, or for a panel of a layout not yet seen (only
`total_score_image_5` has been), a plain panel of the same geometry stands in and names what each
count counts, and a line under the card gives a code for a report. Art that did not come is asked
for once more after each read.

### The どんメダル plate

The medal card is drawn as my page draws it: the season's name and the count, or COMPLETE, as text
over Hiroba's own plate, on the app's own surface. The plate is `imgsrc_tokenplate.php?id=` and the
id your page writes, which names your season: the platform keeps it, and it never reaches the
window, a code or a file name. The window asks for "the どんメダル plate", and nothing more.

- One request per season, and one more once the set is COMPLETE, in case the art changes then. The
  plate is kept on the device for good, under your player, by its id and state, so a read that
  finds the same season asks Hiroba for nothing, and no other account is given it.
- Asked for once the card is on screen after a read, one at a time in the queue with every other
  request. Never retried: a plate that did not come is asked for once more after each read.

Until the plate comes, or if it does not, a pale pill of the same shape stands in under the same
words, and a line under it gives a code for a report. A page with no どんメダル plate, and one this
version cannot read, show the card as before, and ask for no picture. With
`ABTH_DEBUG_SAVE_READS=1`, every plate is kept in `debug\history`, named by its path alone.

### The My Don portrait

Beside the plate stands your マイどん, Hiroba's own picture of your Don in the costume it wears, on
a pale blue tile of Hiroba's shape. Where the costume may be changed, it opens the editor. It is the
one picture from off Hiroba:
`https://img.taiko-p.jp/imgsrc.php?v=&kind=mydon&fn=mydon_` and your taiko number, as your page
writes it. The platform holds that address to that exact origin, path and query, builds it again
itself, and fetches it with no cookie at all and Hiroba's origin alone as the Referer, as a browser
does. The taiko number stays with the platform: it reaches neither the window, a code nor a file
name. The window asks for "the My Don", and nothing more.

- Kept on the device, one per player: the last one fetched. A launch or a sign-in shows it and asks
  nothing.
- Fetched anew only after a costume change or undo applies, and after you press **Read again**, so
  a change made on Hiroba's own site shows after the next **Read again**. Asked for once the tile is
  on screen, one at a time in the queue, so never between a write's requests. If that fetch fails,
  the one kept stays on the tile until the next of those.

Until the first one comes the tile is empty, with a small spinner; if it does not come, the tile
stays empty and the line under the card gives a code for a report; it is asked for once more after
the next read. With `ABTH_DEBUG_SAVE_READS=1`,
each is kept in `debug\history`, named by its path alone. On Android, the WebView's cookie store
decides what the native HTTP client sends: Hiroba's session is kept for Hiroba's domain alone, so
the picture host never gets it, though a cookie the picture host set itself would go back to it.

## The first real costume write

The first real write of each kind is made by you, on the desktop, with your own account. Start with
a single colour. The app has only ever written to the stand-in; this checks that Hiroba accepts a
post from the app at all.

**Before you start.** Pick a time outside 05:00–07:00 JST. Close any other copy of the app. The run
below uses the same data folder as the installed app, `%APPDATA%\A Better Taiko Hiroba`, so it
opens signed in if you are signed in there. A plain `bun run dev`, against the stand-in, keeps its
own folder and never touches this one.

**1. Start the development run with the gate open.** From this folder, in Git Bash:

```bash
ABTH_UNVERIFIED_WRITES=1 ABTH_DEBUG_SAVE_READS=1 bun run dev -- --real
```

or in PowerShell:

```powershell
$env:ABTH_UNVERIFIED_WRITES = "1"; $env:ABTH_DEBUG_SAVE_READS = "1"; bun run dev -- --real
```

The app reads your page as usual (sign in first if it asks). The My Don portrait on the identity
card now opens the costume editor, and shows an edit badge under the pointer; only a run started
this way lets it.

**2. Open the editor and check it.** Click the portrait: one read of `mypage_kisekae.php`,
then one of `imgsrc_mydon.php` for the picture at the top, which shows your Don as it is dressed
now. Under **いろ**, each of かお, どう and てあし outlines the colour you wear; under **きせかえ**,
each slot highlights the item you wear, or はずす. **Changes** says "Nothing changed yet."

**3. Change one colour, and nothing else.** Under いろ, pick かお (or どう, or てあし) and press a
different swatch; the picture redraws in it. **Changes** must list exactly one line, such as
`かお: #8 → #3`. Do not touch きせかえ.

**4. Review and save.** Press **Review**. The dialog repeats the one change, and asks you to tick
"This is the first write of this kind from the app…", noting that it also reads your title before
and after. Tick it and press **Save to Hiroba**. The dialog shows "Saving… then reading it back"
while the app sends, in this order and once each (a picture of the set or of an item, asked for
as you picked, may come before or after these, never between them):

1. `GET mypage_top.php`: your title, before — read first, since my page's forms issue a token too;
2. `GET mypage_kisekae.php`: a fresh token and the whole set, checked against what the editor showed;
   the last page read before the posts, so its token is the one Hiroba accepts;
3. `POST ajax/check_ip_kisekae.php`: the pre-check, which changes nothing; only the answer
   `{"result":false}` lets the app go on;
4. `POST ajax/change_mydon.php`: the save, sent once;
5. `GET mypage_kisekae.php`: the whole set read back;
6. `GET mypage_top.php`: your title, after.

**5. Read what it says.**

- "Saved. Hiroba now shows the new costume.", in green, and a Snackbar offering **Undo**, on the
  Overview only, which shows the undo running and how it ended: it worked. The read-back shows
  exactly the one colour changed and the title unchanged.
- "Hiroba didn't accept the app's request. Nothing was changed.", with a code for a report: the
  pre-check did not answer `false`. Hiroba may refuse posts from a client that is not a browser.
  Nothing was saved. Stop here and keep the code.
- "Hiroba asked for a confirmation this app does not give yet…": nothing was saved. Stop here.
- Anything else says whether something may have changed. "Couldn't read the result back" means
  open the editor again and look; do not save again first.

**6. Undo.** Press **Undo** in the Snackbar, or **Undo last costume change** on the identity card,
which stays after the Snackbar goes and across restarts. It is a write like the first, the same
six requests, from the colour you set back to the one you had. Expect "Undone. Hiroba shows the
costume as it was." If the costume was changed anywhere else in between, the undo stops without
sending the save and says so.

**7. Check.** Press **Read again**, open the editor, and see all eight values as they were before
step 3. Close the app.

**What is left on disk.** `%APPDATA%\A Better Taiko Hiroba\debug` holds the pages the run read
(`mypage_kisekae.php.html`, `mypage_top.php.html`, `imgsrc_danlabel.php.png`,
`imgsrc_mydon.php.png` and a `.json` for each), with each form token replaced; they carry your
nickname and taiko number, so delete them once they are not needed. If an earlier version of the
app left `last-read.html` and `last-read.json` there, delete those too: they carry the same.

`undo.json` there keeps, under your taiko number, the undo record of your last change not yet
undone, and a write whose end is not known yet; never a token. The undo in step 6 spends the
record, so after it your entry is gone and the file holds no taiko number. If you stop after step
5, the record, with your taiko number, stays there until it is undone.

**Then.** Tell the session the outcome, the codes shown if any, so the write is recorded with the
other executed writes and in the wiki. The next check is a きぐるみ and its undo, the same way;
after both, costume writes can be marked verified for the desktop in a commit of their own, and
only then can a packaged build send them.

## Android

| Script | What it does |
|---|---|
| `bun run android:apk` | Web build, `cap sync`, debug APK. |
| `bun run android:run -- <adb serial>` | The same, then installs and starts it on that device. |
| `bun run android:live -- <adb serial> <LAN IP>` | Vite's dev server on this computer, and the debug app loading it with live reload. It runs only against the stand-in, and refuses to start unless both `VITE_ABTH_DEV_HIROBA_ORIGIN` and `VITE_ABTH_DEV_IDP_HOST` are set; `VITE_ABTH_DEV_IMG_ORIGIN`, the stand-in's picture host, is optional. |
| `bun run android:keystore` | Makes the local release key, once per machine. It refuses to run if a key exists. |
| `bun run android:release` | Web build, `cap sync`, signed release APK. It refuses to run without the key. |
| `bun run android:install-release -- <adb serial>` | Installs the signed release APK on that device and starts it. |

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

### The release key

`android:keystore` writes `android/abth-local.jks` and `android/keystore.properties`, which holds the
key's random password. Git ignores both, and the password is printed nowhere. **Back up both files
outside git.** A release build signed with another key cannot update an installed one; you would
have to uninstall it first.

## Where the session lives

Hiroba's session is one cookie, `_token_v2`. No code in the interface ever holds its value.

**Desktop.** The sign-in window runs on an in-memory browser session, new for every attempt and
cleared when the window closes. The cookie is held in the main process, and kept on disk, in plain
text, in `session.json` in the app's data folder (`%APPDATA%\A Better Taiko Hiroba`), so you stay
signed in across launches until you sign out or Hiroba ends the session: the user's call,
2026-09-27. Signing out, or a read or write that finds the session gone, deletes the file.

**Android.** The sign-in runs in the in-app browser, which shares the app's WebView cookie store,
and Capacitor's native HTTP client reads Hiroba through that same store. The store is kept across
launches, so you stay signed in there too. The app wipes every cookie when a sign-in starts, when
one is cancelled or cannot open, at sign-out, and when a read finds the session gone. Between a
sign-in and the next sign-out, the app's private storage holds:

- `_token_v2`, in plain text, in the WebView cookie database (`app_webview/Default/Cookies`);
- the Bandai Namco ID host's Domain cookies (its host-only cookies are cleared after sign-in);
- the WebView's HTTP cache, which is cleared when the next sign-in browser opens;
- web storage of donderhiroba.jp and bandainamcoid.com, which the app cannot clear.

This is an accepted exception to the rule that the session is never stored in plain text. The app
turns off Android backup and device transfer for all of its data, so none of it leaves the device
that way.

## Where pictures are kept

Each of Hiroba's pictures the app shows, an item's thumbnail, the score panel's art, your title
plate or your どんメダル plate, is fetched once and kept on the device for good, since arcades often
have poor networks (the user's call, 2026-09-28). Your マイどん is kept too, the last one fetched, and fetched anew only as
[The My Don portrait](#the-my-don-portrait) says. Signing out deletes none of them, and neither
does the next sign-in, though the card lets go of those it showed and takes them from the device
again, so it never shows the last player's while the next one's come.
Thumbnails and the panel's art show no player and are kept for any account on the device; a plate
is kept under its player, so no other account is given it. Only the checked PNG bytes are kept, under SHA-256 names:
no URL, header, cookie, taiko number, title or medal id.

- **Desktop:** one file per picture in `pictures` in the app's data folder:
  `v1\shared\<hash>.png` for a thumbnail or the panel's art, `v1\player\<hash>\<hash>.png` for a
  plate or the portrait.
- **Android:** the app page's IndexedDB, `abth-pictures`, under the same names. The system may drop
  it when storage runs short, which costs only fetches. Live reload loads the page from another
  origin, so a run against the stand-in keeps its pictures apart from the installed build's.

Nothing in the app deletes a picture but a new `PICTURE_EPOCH` in
`src/hiroba-session/picture-store.ts`: the next launch clears whatever an older one kept. To clear
them by hand, delete the `pictures` folder, or clear the Android app's data.

## Signing in for real

Debug builds let any computer paired with the device over adb open the app's WebViews in DevTools
and read its files with `run-as`. So:

- Sign in with a real account only on the signed release build (`android:keystore` once, then
  `android:release` and `android:install-release`). On Windows, use the packaged or portable exe.
- Uninstall the debug build, or clear its data, before a real sign-in on that device.
- Never run `run-as` or DevTools against the app while a real session exists on the device.

Automated checks and agents never press "Sign in" against the real sites: not in a packaged build,
not under `dev -- --real`, and not on a release APK. The end-to-end run and the smoke test use the
stand-in or stop at the first screen.
