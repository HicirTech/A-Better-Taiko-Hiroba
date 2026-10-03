# @abth/gui

The desktop and Android app of A Better Taiko Hiroba. One React and Material UI web bundle runs in
two shells: Electron on Windows, Capacitor on Android. It signs in to Donder Hiroba on Hiroba's own
pages and reads your own page: one request per read, and one more for your dan label when the page
shows one, since the page gives the dan only as that picture. The Overview opens as your page's
header does: your My Don as Hiroba draws it, beside your nickname, title and dan on Hiroba's own
title plate and dan label, and under them Hiroba's score panel, its ten counts written over its art.
Under that come the seven score ranks and the three crowns again, each block as one bar of shares
with a legend of Hiroba's own icons and percents, like GitHub's "Languages" box (an item's name shows
on hover or keyboard focus, and on Android as a Toast on a long-press; its count is the bar's
tooltip); the season's どんメダル on Hiroba's own plate, and your favourite songs. It can also change your costume (きせかえ), your title (称号) and your nickname
(ドンだーネーム), on the desktop and on Android alike, in every build (see [Writes](#writes)).

The window has no header. On a wide window a side panel, like Gmail's, lists its five pages:
**Overview** (the identity card with the score panel, the shares and the どんメダル),
**Costume** (the きせかえ editor, see [The Costume page](#the-costume-page)),
**Nickname & title** (the title and the nickname, see [The Nickname & title page](#the-nickname--title-page)),
**Favourites** (the 大好きな曲 and the お気に入り folder) and **Settings** (the language, and
signing out). On a narrow one, a menu button
at the top left opens the same list in a drawer. On Android, Back closes the drawer or an open dialog (the Costume page's History, say), goes from
Costume, Nickname & title, Favourites or Settings back to the Overview, and from the Overview leaves
the app as before.
Every page keeps room for the scrollbar, so the page does not shift sideways from page to page.
The app is light or dark as the system is (Windows' app mode, Android's dark theme), and the
page's `color-scheme` follows, so its scrollbars and the system's own widgets do too.
The app opens on the page last shown on the device;
signed out, the Overview, Costume, Nickname & title and Favourites show the sign-in card, and Settings
still works.
Settings is laid out as Gmail's settings are: sections with small headings, each with its icon, and
each setting one row with its name, a line on it where one helps, and its control. **Language**
lists its choices with radio buttons; **Account** says who is signed in, by the nickname your page
gives, with the note on staying signed in and **Sign out** beside it. While a read runs it says
**Signed in**, and **Sign out** is shut until the read ends.

Signed in, the Overview and Favourites read your page again from a small round **Read again**
button with a refresh arrow at the top right, which stays there as the page scrolls. It spins
while a read runs, and it is shut then, and while a costume, title or nickname save or undo runs, so
one read runs at a time and none inside a write. On a touch-first screen (`pointer: coarse`), pull
the page down from its top instead: a round indicator follows the finger, and letting go once its ring is full
reads again (a finger on a box that has scrolled, such as the costume's grid of items, is the
box's to scroll back, and pulls nothing). There the button is drawn only when the keyboard's focus
is on it, and it stays for screen readers. The line under the page still says when it was read, in
the device's time zone, with the month as a short name and the time to the second.
On the Costume page the same button, and the same pull, read the editor again instead of your
page; on the Nickname & title page they read your page and then the list of titles.

The app id is `com.hicirtech.taikohiroba` on both platforms. Android debug builds are
`com.hicirtech.taikohiroba.debug`, labelled "A Better Taiko Hiroba (debug)", so a debug and a release
build can sit on one device side by side.

## Languages

The app is in English, 日本語, 简体中文 and 繁體中文. Until you pick one, it opens in the first of the
system's languages it carries, as `navigator.languages` lists them (on the desktop, Electron's
locale first, then the system's list); zh-HK, zh-TW and zh-MO read as Traditional Chinese, any other
Chinese as Simplified, and English is the fallback. The language setting in **Settings**, a radio
button per choice as in Gmail's quick settings, **System default** first and then each language
named in itself, changes the language at once, asking Hiroba nothing, and keeps the pick on the device (the page's
localStorage) for the next launch, a pick of the language already shown included. Its **System
default** forgets the pick, so the app follows the system's language again, at once and at each
launch. Counts, percents and times follow the language through `Intl`, and the page's `lang`
names it, so the system picks fonts for it. The game's terms are worded in each language, as
taiko.wiki words them, then Bandai Namco's own sites: the score ranks, the crowns, the charts, the
dan, the Don Medals, My Don and the costume's tabs, colours and slots. 日本語 keeps Hiroba's own
words, and a dan is named by its board number, so its name follows the language while its picture
stays Hiroba's. What Hiroba writes as data is never translated: the nickname, a title, a medal's
name and the sentences it speaks in its own voice. An element that holds only such words is marked
`lang="ja"`, so it keeps Japanese glyphs and a screen reader's Japanese voice; a sentence that
only quotes them keeps the app's language. The catalogs are in `packages/i18n`; the type checker
and the tests hold each to every English key and its parameters, and keep Japanese in English and
Chinese to Hiroba's own words.

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
| `bun run e2e:desktop` | Builds, then checks the pages (a side panel on a wide window, and on a narrow one a menu button whose drawer a pick, Escape or a tap outside closes; the Costume page between the Overview and Favourites, in both; the sign-in card on the Overview, Costume and Favourites while signed out, the page shown kept for the next launch, and the page's column in one place on a page that scrolls, one that does not and the Costume page), the scheme (dark or light as the system asks, the page's `color-scheme` with it), Settings (sections with small headings, each with its icon, over one list of rows; who is signed in, or no one, with **Sign out** in the app's casing beside it; while a read the stand-in holds runs, **Signed in**, with **Sign out** shut), the language (opened on a system in Traditional Chinese, the app is in it; its choices are radio buttons in one group the section's heading names, and the arrows move the choice; a pick in Settings, of the language shown or another, takes hold at once, is kept for the next launch, and redraws the profile as it was read, asking Hiroba nothing; System default follows the system again, at once and after a relaunch; the game's terms follow the language, while the nickname, the title and the medal's name stay marked Japanese), and drives sign-in, reading, reading again (from the small Fab, which is shut and spins while a read the stand-in holds runs, a second press sending nothing; on an emulated touch screen, by a pull from the top of the page past the point, not by a short, upward, sideways or lower one, the Fab then drawn only under the keyboard's focus, and a slow pull begun on the portrait opening no tooltip; and by neither while an undo waits on its pre-check), a rotated session, a lost session (the next sign-in shows none of its pictures, the Costume page's picture of the set included), cancel and sign-out (in Settings) against the stand-in, with a dan read off its label and a label that does not read, the panel's counts of 0 (still listed, with no part of a bar), the Overview shaped like my page's header (the portrait beside the plate and the score panel, its tile level with them top and bottom at every wide width, one under another on a narrow window, with no background art and no frame on the blocks, a small "Last updated" line under them), the legends' icons (a dot while one does not come, each fetched once per device, its name a tooltip on hover and on keyboard focus), the score panel (a plain stand-in while its art does not come, its counts as text where my page writes them, the art fetched once per device), and the identity card on its title plate (on the app's own surface, its words still text, one request per title, a plate that does not come, the plate kept across sign-outs and relaunches), the My Don portrait (from the picture host with no cookie, a first one that does not come, kept across relaunches and sign-ins, fetched anew after **Read again** and after a change or undo applies but not after a save that moves nothing or a title's save, the kept one still shown when a fresh one does not come), and the どんメダル plate (asked for only once its card is on screen, its words still text over it at my page's offsets, one request per season and per state, a plate that does not come, its id in neither the window nor any file but the debug copies, the plate kept across sign-outs and relaunches). It checks the Costume page, with no flag set at all (the editor read once when the page is first shown in a run, never at start-up or on a reopen, and not before a rename that is running has ended; read again by the Fab, or by a pull on an emulated touch screen, instead of your page, a draft kept over a set that has not moved and dropped over one that has; a draft that survives a visit to another page, and Reset; on a wide window three columns (the picture with the buttons under it and no bar, kept in view as the page or the grid scrolls; the parts, each with its pick, picked by click, arrow keys, Enter and Space; the grid, as tall as the window, with larger cells), on a narrow one the tabs and the bar of **History**, **Reset** and **Save to Hiroba** flush with the window's bottom edge, the part picked kept from one to the other, and the page the width there is on a wide window and a column on a narrow one), the editor's picture of the set (shown when the page is first shown, redrawn after a pick, one request for a burst of picks, a picture that does not come, none away from the page, and one asked for during a write waiting until the write is done) and its items' thumbnails (only the rows on screen and one ahead, each once, the parts list's own each once and none during a write, kept across sign-outs and relaunches, one that does not come, one the editor did not offer, a grid that has scrolled left to its own finger, shapes the bridge refuses, and one asked for during a write waiting until the write is done), then changes a colour and a Mascot with one press of **Save to Hiroba** each (no review, and no message when a write applies) and checks each write sent exactly the requests planned; it goes back to an earlier set from **History** and saves it, and checks the History: the new set first and the old one second, each with its picture, a set worn again moved up and listed once, a pick shown at once from the picture kept with nothing asked of Hiroba, the dialog's names and its **Worn now** mark, Escape and **Close** giving the focus back, full screen on a narrow window, opened from the bar's button there, and the list kept across a relaunch and a sign-out; it tries the #22 trap, a save that moves nothing, pre-checks that stop, a post sent to the login page, a post answered with a redirect (followed with one GET, or for a 307 or 308 handed back, and never sent again), a save after a change made elsewhere (stopped, with the draft and a notice kept), a session that ends before and after a save, and Hiroba's daily break; it checks the portrait is the button to the Costume page, with no **Change costume** button beside it and no edit badge on it, shows its name under the pointer, and goes there by a click, by Enter and by Space, on an emulated touch screen too, and there by a long-press alone (its description saying to long-press; not by a tap, nor by a finger held as long but moved, which reads nothing either; and the lift after it makes no click on the page it went to), the name plate the same way to the Nickname & title page; and, on a launch with no flag set, that a write asked for while signed out sends nothing and that, signed in, the Costume page opens the editor and a write reaches Hiroba. It checks the Nickname & title page, third in the navigation with a pencil beside its name, in the panel and the menu and as the others signed out: the list of titles read once, when the page is first shown and never before, nor while a costume write is held, with the title worn marked **Current** (every title that shares its name, or none for a name no title has, each with its note); a picker that lists each title once however it is searched, with option ids that do not repeat, and buttons named in the app's words; a title picked, reviewed and saved with exactly the planned requests (the costume page read on both sides, the title page, the pre-check carrying no token, the save in the page's field order, my page read back, and then my page once more for the plate, behind the page: the outcome announced once, the keyboard's focus kept and the My Don not fetched again), its undo as one save, a pre-check that stops, a save that moves nothing, a stale token, a code Hiroba gives no message for, the costume moving during the write, and an undo to a name several titles share or no title has, shut with its reason and refused unsent with the record kept; a rename (the field holding the nickname worn and counting it to ten; nothing sent for the same nickname, none, one too long, one with a control character, or while my page says renames are closed, which it says why; the review saying Hiroba may not let it be changed back; five requests with no pre-check and no second read of my page; the post in the dialog's field order; its undo as one save, one Hiroba refuses keeping the record, a nickname the filter refuses and Hiroba's words shown as the text they are, with the field keeping what was typed, and nothing judged until an IME composition is committed); no read of any kind (my page, the editor, the titles, the preview), no second write and no sign-out while a write of any kind waits on its save or its pre-check, the four reads asked through the bridge going after it in the order asked; a session that ends after a title's save, settled by the next read of my page; titles and nicknames marked Japanese; and neither written in Hiroba's daily break. It then searches the app's data folder for anything the session left behind, and for every form token the stand-in handed out, and checks the pictures kept there are named by hashes alone. In the report it prints, every check is `true` except `tokenInRendererDom` and `partitionsFolder`, which are `false`; the my-page read counts are `1`, `2` and `1`; and `userDataHits` is empty. |
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable zip in `release/`, for x64: `ABTH-<version>-setup.exe` and `ABTH-<version>-portable.zip`. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in", and refuses to start at all while the packaged app keeps a session in `%APPDATA%\A Better Taiko Hiroba`, since the app would then read the real Hiroba by itself. |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app. `ABTH_DEV_IMG_ORIGIN` adds the stand-in's picture host, which `bun run dev` and
the end-to-end run set; without it no picture host is asked anything, and set alone it stops the app.

The installer and the exe in the zip are not code-signed, so Windows SmartScreen warns before the
first run.

The zip needs no install: unzip it into a folder of its own (Explorer's **Extract All** makes one)
and run `A Better Taiko Hiroba.exe` in it. It starts faster than a self-extracting exe, which
unpacks itself at every launch. Like the installer's app, it keeps its data in
`%APPDATA%\A Better Taiko Hiroba`.

### Writes

The app can change three things on Hiroba: the costume, the title and the nickname. Every
write is open in every build, on both platforms: the desktop in development, the installer and the
portable zip, and the Android debug and release APKs. There is no flag to set and nothing to
unlock. The costume is changed on [the Costume page](#the-costume-page), the title and the nickname on
[the Nickname & title page](#the-nickname--title-page).

Every write goes the same way: read the editor for a fresh form token and the whole set, keep an
undo record, send the pre-check (a rename has none), send the save exactly once, and read the whole
set back. The set read back decides the outcome, not Hiroba's answer. The undo record is
`undo.json` in the app's data folder on the desktop, and the `abth-undo` database in the app
page's IndexedDB on Android; a write whose record cannot be kept is not sent. The record holds the sets and whose they are, under
your taiko number, never a token or a cookie, and an undo spends it. No request is retried, and no
post goes out between 05:00 and 07:00 JST, Hiroba's daily maintenance: the clock is looked at
before a write starts and again just before each post.

Every read of Hiroba goes in the same queue as the writes, on both platforms: your page, the costume
editor, the list of titles and Hiroba's picture of the set, and a picture's fetch too. A write holds
the queue for all its requests, so no read and no picture lands between them. A page first shown
while a write of any kind runs reads when the write has ended, not before.

A kind of write that has not been made for real from a platform also reads one other page before
and after, to see that nothing else moved: a costume write reads your title on my page (six
requests, not four), a title write reads your costume (six, not four), and a rename reads your title
on my page (five, not three). `LIVE_CHECKED_WRITES` in `src/hiroba-session/live-checked-writes.ts`
lists, for each platform, the kinds that have. That list decides those two reads and nothing else:
it opens nothing and shuts nothing.

Two variables are read by the desktop app alone. `ABTH_DEV_NOW` (an ISO time) fixes the clock the
maintenance check uses, for tests, and only an unpackaged run takes it. `ABTH_DEBUG_SAVE_READS=1`
is taken by a packaged build too, so the installer's or the portable zip's app keeps each page a
read brings back in the data folder's `debug` folder, named after the page, with every form token
replaced by `<tckt>`, once it is started with the variable set. Every answer is also kept in
`debug\history`, in the order it came and with its time, so a write can be followed step by step; of
a post, only Hiroba's answer is kept, never the form the app sent. A rename's answer holds the
nickname that was asked for, taken or refused, so the folder holds those too, beside pages that
carry your nickname, taiko number and title already: keep the folder to yourself, and delete it
when you are done.

### The Costume page

The page of the きせかえ editor, second in the navigation, between the Overview and Favourites. The
My Don portrait on the Overview is the way to it, whenever you like: a click, Enter or Space, and
on a touch-first screen (`pointer: coarse`) a long-press of about half a second, held still, so a
tap, a scroll or a pull begun on it goes nowhere; a pointer on it shows its name, and where a
long-press opens it, screen readers are told to long-press.

On a wide window (the side panel showing) the page is three columns. The first holds Hiroba's
picture of the set as picked, with **History**, **Reset** to put the draft back to the set as read
and **Save to Hiroba** under it, then a write's notice and the Mascot note; it stays in view as the
page scrolls. The second lists the eight parts under **Colours** and **Costume** (Hiroba's いろ and
きせかえ), each row with what the draft holds there: a swatch, the item's thumbnail, or a blank tile
for none. A click, or Enter or Space, picks a part, and the arrow keys move along a group. The third
is the part's palette or items' thumbnails, larger, as many to a row as fit and as tall as the
window. On a narrow window the page is a column, as wide as the window on a phone: the picture, the
**Colours** and **Costume** tabs over a row of tabs for the part, its grid, and the buttons in a bar
at the bottom edge of the window, which stays there as the page scrolls: **History** at the left,
then **Reset** and **Save to Hiroba**. The part picked is the same in both.

- **Reading.** The editor (`mypage_kisekae.php`) is read once, when the page is first shown in a
  run, and never while another page is shown: an app that opens on the Overview does not read it
  at all until you go there. Shown while a write of any kind runs, it reads when the write has
  ended. After that it is read again only when you press **Read again** on
  this page, or pull it down on a touch screen, which read the editor here, not your page; a
  write's own read-back brings the set up to date without another read. A draft made over the set
  a read finds unchanged is kept by it; one made over a set that has moved is dropped for the set
  as read.
- **The draft** outlives a visit to another page and back, for as long as the app runs, with the
  notice of a write you left. Hiroba's picture of it is kept too, and not asked for again.
- **The write.** **Save to Hiroba** is one press, with no review, and shut while the draft is the
  set as read. The write goes the way [Writes](#writes) says, and the page shows its progress in
  place of the editor. When it ends the editor is back at once, on the set Hiroba now shows if the
  costume changed, and a write that applied says nothing: the picture and the My Don show it. Any
  other ending shows its notice above the editor, until the next pick, **Reset**, save, history
  pick or read, and leaves the draft as it was, so a save that failed can be pressed again. There
  is no Snackbar, and the page has no undo.
- **History.** The costumes you wore, newest first, each set once and at most 30, kept on the
  device per taiko number (`costume-history.json` in the app's data folder on the desktop, the
  `abth-costume-history` database on Android), across relaunches and sign-outs, and shown only to
  the player they belong to. It asks Hiroba nothing, and a history that cannot be read or saved
  changes nothing of a write and shows no error. A write that changed the costume adds the set it
  moved to and the set it moved from, each moved up if it was listed. An entry keeps Hiroba's
  picture of its set from the last previews the app fetched in that session (eight are held in
  memory, and dropped when the session ends), or the picture it had. A failed, unknown or undone
  write changes nothing. **History** opens a dialog, full screen on a narrow window, with a button
  for each entry and the set worn now marked. A pick puts its set in the draft and its picture on
  the big preview at once, asking Hiroba for nothing; **Save to Hiroba** then writes it like any
  other change.

### The Nickname & title page

The page that changes your title (称号) and your nickname (ドンだーネーム): third in the navigation,
between Costume and Favourites, with a pencil beside its name. The name plate on the Overview is the
way to it, as the portrait is to Costume: a click, Enter or Space, and on a touch-first screen a
long-press. It opens on Hiroba's title plate as the Overview draws it, so the result is seen at once, then two sections, **Title** and **Nickname**,
each with its own **Review**, confirmation, **Save to Hiroba**, outcome and undo. Both are open in
every build. One write runs at a time, from either section: while it does, nothing on the page is
pressed, and a write asked for elsewhere answers busy and sends nothing. Like the costume's, both
sections' state is the window's, so a pick, a field, a review or an outcome is still there after a
visit to another page or a read of your page.

- **Reading.** The list of titles you own (`mypage_title_edit.php`, one request) is read once, when
  the page is first shown in a run, and never at start-up or while another page is shown; shown
  while a write of any kind runs, it reads when the write has ended. After that it is read again
  only when you press **Read again** here (or pull the page down), which
  reads your page and then the list. The nickname has no read of its own: it is the one your page last
  showed, and a write's read-back is put in that copy with no request.
- **Title.** An owned title is picked by its name from a list you can search (full-width and
  half-width forms, capitals and the two kinds of space Hiroba writes are not told apart); each is
  shown as Hiroba writes it, and by its number too when another title has the same name. The title
  worn is marked **Current**. Hiroba shows only a worn title's name, never its number, and a name can
  belong to several of your titles, so a name that several share marks all of them and says the app
  cannot tell which you wear, and a name none has says it may be built from parts, which this
  version can neither read nor change back. There is no remove and no composer. The picker's own
  buttons, to show the list and to clear what was picked, are named in the app's language too.
- **Title undo.** It writes the previous name back, by name, so it is offered only when that name
  is exactly one title of today's list: otherwise its button is shut, and the page says why in
  words (a shared name, a name not in the list, no title before). Asked for anyway, the core
  refuses it unsent and the record stays.
- **Nickname.** The field holds the nickname you wear, to the ten characters Hiroba's form takes,
  with a counter, and the nickname is trimmed before it is sent. What the form itself would not take
  is refused, in the page and again by the core: no nickname, white space at either end, more than
  ten, a character that cannot be sent. What Hiroba's help page says (hiragana and ー ～ ！ ？, five
  characters) and its warning against personal information are shown as Hiroba writes them, and
  advice lines say when a nickname is outside the help page or wider than ten half-width
  characters; none of it refuses anything, since nicknames outside it exist on the site. A nickname
  is not sent if it is the one worn. While an IME composition is open, the field judges nothing: the
  counter, the advice, the note that it is the nickname worn and **Review** read the nickname as it
  stood, until the composition is committed.
- **Nickname, closed.** When my page hands its rename dialog the flag that says renames are closed, the
  field is shut and the section says why, in Hiroba's words; when it hands none the app can read,
  the field stays open with a note. The editor read at write time decides again.
- **Nickname, review.** The confirmation says plainly that Hiroba may not let the nickname be
  changed back right away: choose a nickname you are happy to keep. The undo is offered, and says
  Hiroba may refuse it too, leaving the nickname as it is.
- **Outcomes.** They are worded for the title and the nickname apart from the costume's (Hiroba's code
  for a title it will not take, or a nickname it could not update, comes with no message, so the page
  says what it means), and Hiroba's own words, when it has some, are shown as the plain text they
  are. After a title write that moved the title, your page is read again once, for the plate, behind
  the page, which stays as it is until your page is in, so the outcome is announced once and the
  keyboard's focus is not lost; the My Don is not fetched anew for it, since only a costume change
  and your own **Read again** do that. The Fab spins and Sign out is shut meanwhile.
  A rename puts the nickname it read back into the window's copy of your page, and reads nothing more.

### The costume preview

The Costume page shows at its top Hiroba's own picture of the set as picked, as Hiroba's editor
does in its 今のきせかえセット box: `imgsrc_mydon.php` with the three colours and five slots in its
query. The platform fetches it with the session and hands the window a `data:` URL, so neither the
address nor the cookie reaches the window. It asks once when the page is first shown, then once per
pause in the picks (300 ms), one request at a time and never retried, and nothing while the page is
not shown; a set already drawn is shown again without asking, after a visit to another page too, but
not after a sign-out or a lost session: those forget every picture of the set, so the next player's
page never opens on the last one's. It is a read, so both platforms allow it. A picture that does
not come leaves "Preview unavailable" and a code for a report; the editor works without it. With
`ABTH_DEBUG_SAVE_READS=1`, only the latest picture is kept, as `debug\imgsrc_mydon.php.png`, and
none in `debug\history`.

### Item thumbnails

Under **Costume**, each slot shows its items by Hiroba's own thumbnails, in a box like Hiroba's:
six to a row, four rows at a time, scrolled natively or a row at a time with ▲ and ▼, and **Remove**
(Hiroba's はずす) as a button under it. A wide window has a taller box of larger cells, as many to a
row as fit, with no arrows. Each thumbnail is
`imgsrc_kisekae.php?cos=<id>&type=<slot>`. The platform builds that address itself, only for an
item the last editor read offered (one the account owns, or the one it wears), fetches it with the
session, checks that it is a PNG of a thumbnail's size, and hands the window a `data:` URL. The
window names an item by its slot and number, never by an address.

What it costs Hiroba:

- Showing the page on a narrow window costs no thumbnail: it opens on **Colours**. A wide window's
  list of parts asks for the thumbnail of the item worn in each slot, five at most.
- On the items tab, a thumbnail is asked for only once its cell has stayed in the box, or within a
  row of it, for 150 ms, so a fling past a row asks nothing. The first view of a slot asks for 30
  at most, and each row scrolled into view for six more; a wide window's box shows more cells.
- One at a time, after a random pause of up to 100 ms, in the queue with every other request to
  Hiroba, so never between a write's requests; none is asked for while a save or an undo runs.
  At most 300 in a run, and 8 s each on the desktop.
- Never retried while the page stays shown. One that did not come is asked for once more the next
  time the page is shown or the editor is read again, and its cell is seen, within the same 300: if
  Hiroba sends none, each showing asks again for those seen.
- Each is fetched once and kept on the device for good: showing the page again, going back to a
  slot, signing in again or a relaunch asks Hiroba for nothing already shown. See
  [Where pictures are kept](#where-pictures-are-kept).

Hiroba's own editor, for comparison, asks for a whole tab of thumbnails (38 to 76) at once on every
tab click. A thumbnail that does not come leaves the item's number in its cell, and one line under
the box says how many did not, with a code for a report; the editor works as before. Android does
the same. With `ABTH_DEBUG_SAVE_READS=1`, only the latest thumbnail is kept, as
`debug\imgsrc_kisekae.php.png`, and none in `debug\history`; its `.json` counts how many came in
the run.

### The identity card

The block at the top is drawn as my page draws its header: your My Don on the left, a square that
spans the right column from the top of the plate to the foot of the score panel; on the right your
title over Hiroba's own title plate, your nickname in its cream box and your dan's own label in the
blue one, and under the plate [the score panel](#the-score-panel). On a narrow window they stack,
the portrait first. All sit on the app's own surface rather than Hiroba's yellow, with no
background art and no frame. Your region is not shown. The words stay text over the pictures, and
the block keeps Hiroba's proportions at any width, up to half again its size. The plate is also the
button to [the Nickname & title page](#the-nickname--title-page). The label is the picture the read already fetches to read
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

### The legends' icons

Each item of the score-rank and crown legends shows Hiroba's own icon beside its percent. Its name
shows as a tooltip on hover or keyboard focus, and on Android as a Toast on a long-press, and
screen readers get the name and the percent. The icons are static art on Hiroba's host:
`image/sp/640/best_score_rank_<n>_640.png` for the ranks, and `image/sp/640/crown_0<n>_640.png` for
the crowns, by the recent-plays page's numbering, where gold is 02 and silver is 03. The window asks
for "a rank's icon" or "a crown's icon", and nothing more. The art names no player, so it is kept on
the device for good for every account: fetched once, asked for only once its item is on screen, one
at a time in the queue, and never again after it came, relaunches and sign-outs included. Until it
comes, or if it does not, the item's colour as a dot stands in, as in the bar above it; an icon that
did not come is asked for once more after each read.

### The どんメダル plate

The medal card is drawn as my page draws it: the season's name and the count, or COMPLETE, as text
over Hiroba's own plate, at my page's own offsets and size, on the app's own surface. The plate is `imgsrc_tokenplate.php?id=` and the
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

Beside the plate stands your My Don, Hiroba's own picture of your Don in the costume it wears, on
a pale blue tile of Hiroba's shape. It is the button to [the Costume page](#the-costume-page). It is
the one picture from off Hiroba:
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

## Android

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

### Costume writes on Android

A write on Android, of any kind, is the desktop's own, over Capacitor's HTTP client. A post is one native call,
with its form already encoded in the order the page's form holds it and a `Content-Type` of the
app's own, since Capacitor writes no body without one. Capacitor is told not to follow a post's
redirects: a 301, 302 or 303 is followed in the app with one GET that has no body, as the desktop
does, and a 307 or 308 is handed back unfollowed. A write is one turn of the queue, all its
requests: no read and no picture goes out between them. The WebView's cookie store is written to
disk after each write, and the undo record is in IndexedDB, written before the first post, or the
write is not sent. The port also checks every call's arguments, as the desktop's main process does
for its window. Nothing is shut by the build: the release APK writes as the debug one does, and the
list that decides the two extra reads is the one [Writes](#writes) describes.

## Releases

Two workflows run on GitHub Actions. `.github/workflows/ci.yml` runs on a pull request to `main`, on
a push to `main`, and when started by hand. It has two jobs side by side: **Checks** (format, lint,
typecheck, the tests and the GUI bundle) and **Android debug APK** (`bun run android:apk`, on the
runner's Android SDK, with JDK 21 and Node 22).
`.github/workflows/release.yml` builds and publishes a release; [Making a
release](#making-a-release) says what is done by hand.

### The version

`version` in `apps/gui/package.json` is the one place a version is written. It is
`MAJOR.MINOR.PATCH`, and the tag is `v` and the version: `v0.1.0`. electron-builder names the
Windows files from it, and `android/app/build.gradle` reads it too: `versionName` is the same text,
and `versionCode` is `major * 10000 + minor * 100 + patch`, so 0.1.0 is 100 and 1.2.3 is 10203.
Android updates an app only to a higher code, so minor and patch stop at 99 (one more would spill
into the next place, and a later version could get a lower or an equal code), and the code stops at
Android's own limit, 2100000000. A version has no `v`, no pre-release part and no build part. The
Gradle script refuses a version that breaks these rules, so the Android build fails on one.

### Making a release

A release takes two steps by hand, and the workflow below does the rest.

1. Raise the version in a pull request. In a branch, set `version` in `apps/gui/package.json` and
   run `bun install`, so that `bun.lock`, which states each workspace's version too, follows. Commit
   both as `chore(release): bump to <version>`, open a pull request, and merge it.
2. Tag the merge commit and push the tag. On an up-to-date `main`:

   ```bash
   git switch main && git pull
   git tag -a v<version> -m "A Better Taiko Hiroba <version>"
   git push origin v<version>
   ```

   `git tag` tags the commit that is checked out, which is the merge commit while nothing has landed
   after it; give a commit's hash after the message to tag another.

The tag starts the release. If it is not `v` plus the version that `apps/gui/package.json` states at
the tagged commit, the workflow stops the run before anything is built.

### What the workflow builds

`.github/workflows/release.yml` runs when a tag `v*.*.*` is pushed: that is a release. It also runs
as a **dry run**, which builds the same files, keeps them and creates no release: when started by
hand (**Run workflow** in the Actions tab), and on a pull request to `main` that touches what a
release is made of, which is the workflow itself, `apps/gui/package.json` (which also holds
electron-builder's configuration, under `build`) and `apps/gui/android/**`.

A **Version** job reads the version first, and on a tag run stops the run unless the tag is `v` and
that version. Then two jobs run side by side, neither waiting on the other:

| Job | Runs on | Makes |
|---|---|---|
| **Android release APK** | ubuntu-latest, JDK 21 | `ABTH-<version>.apk`, signed with the release key from [the signing secrets](#setting-up-the-signing-secrets). |
| **Windows installer and zip** | windows-latest | `ABTH-<version>-setup.exe`, the NSIS installer, and `ABTH-<version>-portable.zip`, the build that needs no install ([Desktop](#desktop) says how to run it). Both are x64 and not code-signed. |

Each uploads its files as an artifact of the run (**android** and **windows**, kept for 14 days).
On a tag, a **Release** job then runs after both. It downloads the artifacts and runs
`gh release create v<version> --title "A Better Taiko Hiroba <version>" --generate-notes` with the
three files, as `GITHUB_TOKEN` with `contents: write`; the notes list the pull requests merged since
the last release. **The release is published, not a draft**: its files are public as soon as that
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

## Where the session lives

Hiroba's session is one cookie, `_token_v2`. No code in the interface ever holds its value.

**Desktop.** The sign-in window runs on an in-memory browser session, new for every attempt and
cleared when the window closes. The cookie is held in the main process, and kept on disk, in plain
text, in `session.json` in the app's data folder (`%APPDATA%\A Better Taiko Hiroba`), so you stay
signed in across launches until you sign out or Hiroba ends the session. Signing out, or a read or
write that finds the session gone, deletes the file.

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

Each of Hiroba's pictures the app shows, an item's thumbnail, the score panel's art, a legend's icon,
your title plate or your どんメダル plate, is fetched once and kept on the device for good, since arcades often
have poor networks. Your My Don is kept too, the last one fetched, and fetched anew only as
[The My Don portrait](#the-my-don-portrait) says. Signing out deletes none of them, and neither
does the next sign-in, though the card lets go of those it showed and takes them from the device
again, so it never shows the last player's while the next one's come.
Thumbnails, the panel's art and the icons show no player and are kept for any account on the device; a plate
is kept under its player, so no other account is given it. Only the checked PNG bytes are kept, under SHA-256 names:
no URL, header, cookie, taiko number, title or medal id.

- **Desktop:** one file per picture in `pictures` in the app's data folder:
  `v1\shared\<hash>.png` for a thumbnail, the panel's art or an icon, `v1\player\<hash>\<hash>.png` for a
  plate or the portrait.
- **Android:** the app page's IndexedDB, `abth-pictures`, under the same names. The system may drop
  it when storage runs short, which costs only fetches. Live reload loads the page from another
  origin, so a run against the stand-in keeps its pictures, its undo records (`abth-undo`) and its
  costume histories (`abth-costume-history`), the last two each in a database of its own that no
  `PICTURE_EPOCH` clears, apart from the installed build's.

Nothing in the app deletes a picture but a new `PICTURE_EPOCH` in
`src/hiroba-session/picture-store.ts`: the next launch clears whatever an older one kept. To clear
them by hand, delete the `pictures` folder, or clear the Android app's data.

## Signing in for real

Debug builds let any computer paired with the device over adb open the app's WebViews in DevTools
and read its files with `run-as`. So:

- Sign in with a real account on the signed release APK that a published release carries, or on the
  debug APK. On Windows, use the installer's app or the portable zip's.
- Turn wireless debugging off before a real sign-in on a debug build, and never run `run-as` or
  DevTools against the app while a real session exists on the device.
- Uninstall the debug build, or clear its data, once you are done with it, after any undo.

Automated checks never press "Sign in" against the real sites: not in a packaged build, not under
`dev -- --real`, not on a release APK and not on the debug APK. The end-to-end run and the smoke
test use the stand-in or stop at the first screen.
