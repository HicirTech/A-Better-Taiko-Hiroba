# @abth/gui

The desktop and Android app of A Better Taiko Hiroba. One React and Material UI web bundle runs in
two shells: Electron on Windows, Capacitor on Android. It signs in to Donder Hiroba on Hiroba's own
pages and reads your own page: one request per read, and one more for your dan label when the page
shows one, since the page gives the dan only as that picture. The Overview opens as your page's
header does: your マイどん as Hiroba draws it, beside your nickname, title and dan on Hiroba's own
title plate and dan label, and under them Hiroba's score panel, its ten counts written over its art.
Under that come the seven score ranks and the three crowns again, each block as one bar of shares
with a legend of percents, like GitHub's "Languages" box (the counts are in each item's tooltip);
the season's どんメダル on Hiroba's own plate, and your favourite songs. It can also change your costume (きせかえ), your title (称号) and your Donder
name (ドンだーネーム), on the desktop and on Android alike, in every build (see [Writes](#writes)).

The window has no header. On a wide window a side panel, like Gmail's, lists its five pages:
**Overview** (the identity card with the score panel, the shares and the どんメダル),
**Costume** (the きせかえ editor, see [The Costume page](#the-costume-page)),
**Name & title** (the title and the Donder name, see [The Name & title page](#the-name--title-page)),
**Favourites** (the 大好きな曲 and the お気に入り folder) and **Settings** (the language, and
signing out). On a narrow one, a menu button
at the top left opens the same list in a drawer. On Android, Back closes the drawer, goes from
Costume, Name & title, Favourites or Settings back to the Overview, and from the Overview leaves
the app as before.
Every page keeps room for the scrollbar, so the page does not shift sideways from page to page.
The app is light or dark as the system is (Windows' app mode, Android's dark theme), and the
page's `color-scheme` follows, so its scrollbars and the system's own widgets do too.
The app opens on the page last shown on the device;
signed out, the Overview, Costume, Name & title and Favourites show the sign-in card, and Settings
still works.
Settings is laid out as Gmail's settings are: sections with small headings, each with its icon, and
each setting one row with its name, a line on it where one helps, and its control. **Language**
lists its choices with radio buttons; **Account** says who is signed in, by the nickname your page
gives, with the note on staying signed in and **Sign out** beside it. While a read runs it says
**Signed in**, and **Sign out** is shut until the read ends.

Signed in, the Overview and Favourites read your page again from a small round **Read again**
button with a refresh arrow at the top right, which stays there as the page scrolls. It spins
while a read runs, and it is shut then, and while a costume, title or name save or undo runs, so
one read runs at a time and none inside a write. On a touch-first screen (`pointer: coarse`), pull
the page down from its top instead: a round indicator follows the finger, and letting go once its ring is full
reads again (a finger on a box that has scrolled, such as the costume's grid of items, is the
box's to scroll back, and pulls nothing). There the button is drawn only when the keyboard's focus
is on it, and it stays for screen readers. The line under the page still says when it was read.
On the Costume page the same button, and the same pull, read the editor again instead of your
page; on the Name & title page they read your page and then the list of titles.

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
| `bun run e2e:desktop` | Builds, then checks the pages (a side panel on a wide window, and on a narrow one a menu button whose drawer a pick, Escape or a tap outside closes; the Costume page between the Overview and Favourites, in both; the sign-in card on the Overview, Costume and Favourites while signed out, the page shown kept for the next launch, and the page's column in one place on a page that scrolls, one that does not and the Costume page), the scheme (dark or light as the system asks, the page's `color-scheme` with it), Settings (sections with small headings, each with its icon, over one list of rows; who is signed in, or no one, with **Sign out** in the app's casing beside it; while a read the stand-in holds runs, **Signed in**, with **Sign out** shut), the language (opened on a system in Traditional Chinese, the app is in it; its choices are radio buttons in one group the section's heading names, and the arrows move the choice; a pick in Settings, of the language shown or another, takes hold at once, is kept for the next launch, and redraws the profile as it was read, asking Hiroba nothing; System default follows the system again, at once and after a relaunch; the game's terms follow the language, while the nickname, the title and the medal's name stay marked Japanese), and drives sign-in, reading, reading again (from the small Fab, which is shut and spins while a read the stand-in holds runs, a second press sending nothing; on an emulated touch screen, by a pull from the top of the page past the point, not by a short, upward, sideways or lower one, the Fab then drawn only under the keyboard's focus, and a slow pull begun on the portrait opening no tooltip; and by neither while an undo waits on its pre-check), a rotated session, a lost session (the next sign-in shows none of its pictures), cancel and sign-out (in Settings) against the stand-in, with a dan read off its label and a label that does not read, the panel's counts of 0 (still listed, with no part of a bar), the Overview shaped like my page's header (the portrait beside the plate and the score panel, one under another on a narrow window, with no background art), the score panel (a plain stand-in while its art does not come, its counts as text where my page writes them, the art fetched once per device), and the identity card on its title plate (on the app's own surface, its words still text, one request per title, a plate that does not come, the plate kept across sign-outs and relaunches), the My Don portrait (from the picture host with no cookie, a first one that does not come, kept across relaunches and sign-ins, fetched anew after **Read again** and after a change or undo applies but not after a save that moves nothing, the kept one still shown when a fresh one does not come), and the どんメダル plate (asked for only once its card is on screen, its words still text over it, one request per season and per state, a plate that does not come, its id in neither the window nor any file but the debug copies, the plate kept across sign-outs and relaunches). It checks the Costume page, with no flag set at all (the editor read once when the page is first shown in a run, never at start-up or on a reopen; read again by the Fab, or by a pull on an emulated touch screen, instead of your page, a draft kept over a set that has not moved and dropped over one that has; a draft that survives a visit to another page, and Reset; the Save bar flush with the window's bottom edge; a column on a wide window and the whole width on a narrow one), the editor's picture of the set (shown when the page is first shown, redrawn after a pick, one request for a burst of picks, a picture that does not come, none away from the page, and one asked for during a write waiting until the write is done) and its items' thumbnails (only the rows on screen and one ahead, each once, kept across sign-outs and relaunches, one that does not come, one the editor did not offer, a grid that has scrolled left to its own finger, shapes the bridge refuses, and one asked for during a write waiting until the write is done), then changes a colour and a きぐるみ and undoes each from the page, and checks each write sent exactly the requests planned, that the undo shows on the Costume page alone, and that pressing it twice sends one undo; it tries the #22 trap, a save that moves nothing, pre-checks that stop, a post sent to the login page, a post answered with a redirect (followed with one GET, or for a 307 or 308 handed back, and never sent again), an undo after a change made elsewhere, a session that ends before and after a save, and Hiroba's daily break; it checks the portrait is the button to the Costume page, with no **Change costume** button beside it, shows its edit badge and name under the pointer, and goes there by a click, by Enter and by Space, on an emulated touch screen too, and there by a long-press alone (its badge up at rest and its description saying to long-press; not by a tap, nor by a finger held as long but moved, which reads nothing either; and the lift after it makes no click on the page it went to); and, on a launch with no flag set, that a write asked for while signed out sends nothing and that, signed in, the Costume page opens the editor and a write reaches Hiroba. It checks the Name & title page, third in the navigation with a pencil beside its name, in the panel and the menu and as the others signed out: the list of titles read once, when the page is first shown and never before, with the title worn marked **Current** (every title that shares its name, or none for a name no title has, each with its note); a title picked, reviewed and saved with exactly the planned requests (the costume page read on both sides, the title page, the pre-check carrying no token, the save in the page's field order, my page read back, and then my page once more for the plate), its undo as one save, a pre-check that stops, a save that moves nothing, a stale token, a code Hiroba gives no message for, the costume moving during the write, and an undo to a name several titles share or no title has, shut with its reason and refused unsent with the record kept; a rename (the field holding the name worn and counting it to ten; nothing sent for the same name, no name, one too long, one with a control character, or while my page says renames are closed, which it says why; the review saying Hiroba may not let it be changed back; five requests with no pre-check and no second read of my page; the post in the dialog's field order; its undo as one save, one Hiroba refuses keeping the record, a name the filter refuses and Hiroba's words shown as the text they are, with the field keeping what was typed); no read and no second write while either waits on its save or its pre-check; a session that ends after a title's save, settled by the next read of my page; titles and names marked Japanese; and neither written in Hiroba's daily break. It then searches the app's data folder for anything the session left behind, and for every form token the stand-in handed out, and checks the pictures kept there are named by hashes alone. In the report it prints, every check is `true` except `tokenInRendererDom` and `partitionsFolder`, which are `false`; the my-page read counts are `1`, `2` and `1`; and `userDataHits` is empty. |
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable exe in `release/`. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in", and refuses to start at all while the packaged app keeps a session in `%APPDATA%\A Better Taiko Hiroba`, since the app would then read the real Hiroba by itself. |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app. `ABTH_DEV_IMG_ORIGIN` adds the stand-in's picture host, which `bun run dev` and
the end-to-end run set; without it no picture host is asked anything, and set alone it stops the app.

The installers are not code-signed, so Windows SmartScreen warns before the first run.

### Writes

The app can change three things on Hiroba so far: the costume, the title and the Donder name. Every
write is open in every build, on both platforms: the desktop in development, the installer and the
portable exe, and the Android debug and release APKs. There is no flag to set and nothing to
unlock. The costume is changed on [the Costume page](#the-costume-page), the title and the name on
[the Name & title page](#the-name--title-page).

Every write goes the same way: read the editor for a fresh form token and the whole set, keep an
undo record, send the pre-check (a rename has none), send the save exactly once, and read the whole
set back. The set read back decides the outcome, not Hiroba's answer. The undo record is
`undo.json` in the app's data folder on the desktop, and the `abth-undo` database in the app
page's IndexedDB on Android; a write whose record cannot be kept is not sent. The record holds the sets and whose they are, under
your taiko number, never a token or a cookie, and an undo spends it. No request is retried, and no
post goes out between 05:00 and 07:00 JST, Hiroba's daily maintenance: the clock is looked at
before a write starts and again just before each post.

A kind of write that has not been made for real from a platform also reads one other page before
and after, to see that nothing else moved: a costume write reads your title on my page (six
requests, not four), a title write reads your costume (six, not four), and a rename reads your title
on my page (five, not three). `LIVE_CHECKED_WRITES` in `src/hiroba-session/live-checked-writes.ts`
lists, for each platform, the kinds that have. That list decides those two reads and nothing else:
it opens nothing and shuts nothing. The desktop's costume is on it (two writes of the user's,
applied and read back on 2026-09-27); Android's list is empty until the first real Android write has
been made and recorded (see [The first real Android write](#the-first-real-android-write)), and
neither the title nor the name is on either list until the first real ones have been made (see
[The first real title and name writes](#the-first-real-title-and-name-writes)).

Two variables apply to unpackaged desktop runs only: `ABTH_DEV_NOW` (an ISO time) fixes the clock the
maintenance check uses, for tests, and `ABTH_DEBUG_SAVE_READS=1` keeps each page a read brings back
in the data folder's `debug` folder, named after the page, with every form token replaced by
`<tckt>`. Every answer is also kept in `debug\history`, in the order it came and with its
time, so a write can be followed step by step; of a post, only Hiroba's answer is kept, never the
form the app sent.

### The Costume page

The page of the きせかえ editor, second in the navigation, between the Overview and Favourites. The
My Don portrait on the Overview is the way to it, whenever you like: a click, Enter or Space, and
on a touch-first screen (`pointer: coarse`) a long-press of about half a second, held still, so a
tap, a scroll or a pull begun on it goes nowhere; a pointer on it, or the keyboard's focus, shows
a small edit badge (always up on a touch screen, where screen readers are told to long-press).

The page holds Hiroba's picture of the set as picked, the **いろ** and **きせかえ** tabs with the
palette and the items' thumbnails, what the draft changes, **Review**, the confirmation and **Save
to Hiroba**, how the write ended, and the undo of the last change, with **Reset** to put the draft
back to the set as read. It is a column, as wide as the window on a phone, and its buttons sit in
a bar at the bottom edge of the window, which stays there as the page scrolls.

- **Reading.** The editor (`mypage_kisekae.php`) is read once, when the page is first shown in a
  run, and never while another page is shown: an app that opens on the Overview does not read it
  at all until you go there. After that it is read again only when you press **Read again** on
  this page, or pull it down on a touch screen, which read the editor here, not your page; a
  write's own read-back brings the set up to date without another read. A draft made over the set
  a read finds unchanged is kept by it; one made over a set that has moved is dropped for the set
  as read.
- **The draft** outlives a visit to another page and back, for as long as the app runs, with a
  review or an outcome you left. Hiroba's picture of it is kept too, and not asked for again.
- **The write.** Saving and undoing go the way [Writes](#writes) says, and the page shows the
  progress and the outcome in place of the editor until **Back**; the undo on offer, which stays
  across restarts, is on this page and nowhere else. There is no Snackbar: the outcome and the
  undo are already in front of you.

### The Name & title page

The page that changes your title (称号) and your Donder name (ドンだーネーム): third in the navigation,
between Costume and Favourites, with a pencil beside its name. It opens on Hiroba's title plate as
the Overview draws it, so the result is seen at once, then two sections, **Title** and **Name**,
each with its own **Review**, confirmation, **Save to Hiroba**, outcome and undo. Both are open in
every build. One write runs at a time, from either section: while it does, nothing on the page is
pressed, and a write asked for elsewhere answers busy and sends nothing. Like the costume's, both
sections' state is the window's, so a pick, a field, a review or an outcome is still there after a
visit to another page or a read of your page.

- **Reading.** The list of titles you own (`mypage_title_edit.php`, one request) is read once, when
  the page is first shown in a run, and never at start-up or while another page is shown. After
  that it is read again only when you press **Read again** here (or pull the page down), which
  reads your page and then the list. The name has no read of its own: it is the one your page last
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
- **Name.** The field holds the name you wear, to the ten characters Hiroba's form takes, with a
  counter, and the name is trimmed before it is sent. What the form itself would not take is
  refused, in the page and again by the core: no name, white space at either end, more than ten, a
  character that cannot be sent. What Hiroba's help page says (hiragana and ー ～ ！ ？, five
  characters) and its warning against personal information are shown as Hiroba writes them, and
  advice lines say when a name is outside the help page or wider than ten half-width characters;
  none of it refuses anything, since names outside it exist on the site. A name is not sent if it is
  the one worn.
- **Name, closed.** When my page hands its rename dialog the flag that says renames are closed, the
  field is shut and the section says why, in Hiroba's words; when it hands none the app can read,
  the field stays open with a note. The editor read at write time decides again.
- **Name, review.** The confirmation says plainly that Hiroba may not let the name be changed back
  right away: choose a name you are happy to keep. Whether it will is not known yet (see
  [The first real title and name writes](#the-first-real-title-and-name-writes)). The undo is
  offered, and says Hiroba may refuse it too, leaving the name as it is.
- **Outcomes.** They are worded for the title and the name apart from the costume's (Hiroba's code
  for a title it will not take, or a name it could not update, comes with no message, so the page
  says what it means), and Hiroba's own words, when it has some, are shown as the plain text they
  are. After a title write that moved the title, your page is read again once, for the plate. A
  rename puts the name it read back into the window's copy of your page, and reads nothing more.

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

Under **きせかえ**, each slot shows its items by Hiroba's own thumbnails, in a box like Hiroba's:
six to a row, four rows at a time, scrolled natively or a row at a time with ▲ and ▼, and はずす as
a button under it. Each thumbnail is `imgsrc_kisekae.php?cos=<id>&type=<slot>`. The platform builds
that address itself, only for an item the last editor read offered (one the account owns, or the
one it wears), fetches it with the session, checks that it is a PNG of a thumbnail's size, and
hands the window a `data:` URL. The window names an item by its slot and number, never by an
address.

What it costs Hiroba:

- Showing the page costs no thumbnail: it opens on いろ.
- On the items tab, a thumbnail is asked for only once its cell has stayed in the box, or within a
  row of it, for 150 ms, so a fling past a row asks nothing. The first view of a slot asks for 30
  at most, and each row scrolled into view for six more.
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

What the platform's own network stack does with a post has not been seen yet. The rehearsal below
shows it against the stand-in, with nothing at stake; the first real write then checks it against
Hiroba.

### Rehearsal against the stand-in

Run the debug app against the stand-in as in [Android](#android) above, with `bun run android:live`,
and sign in to the stand-in. Read what it saw from this computer, at
`http://hiroba.<LAN IP>.sslip.io:8807`: `/__log` (every request, as `METHOD /path`;
`/__log-reset` clears it) and `/__posts` (each ajax post: its headers, its field names in order,
and whether its token held; `/__posts?reset=1` clears it). Each row is one try; clear both first.

| Do | Expect |
|---|---|
| Change one colour, save. | `/__log` has the six requests, once each: `GET /mypage_top.php`, `GET /mypage_kisekae.php`, `POST /ajax/check_ip_kisekae.php`, `POST /ajax/change_mydon.php`, `GET /mypage_kisekae.php`, `GET /mypage_top.php`. Each post in `/__posts` has `xRequestedWith` `XMLHttpRequest`, an `origin`, a `referer` ending `/mypage_kisekae.php`, `contentType` `application/x-www-form-urlencoded; charset=UTF-8`, `accept` `application/json, text/javascript, */*; q=0.01`, `fields` `_tckt` and then the eight values in the form's order, and `ticketMatched` true. The outcome is "Saved". `connection` is what the platform sent: the app asks for none, and whether to send `Connection: close` on a post is a later choice for this field to inform. |
| `/__post-to-login?on=1`, then save. | The pre-check post is answered with a redirect to the login page. `/__log` shows one `GET /login.php` after it and then the probe GET of the editor, never a second post. The outcome is "Hiroba didn't accept the app's request. Nothing was changed.", and the session is still good. |
| `/__post-redirect?status=303` (then 301 and 302), then save. | After `POST /ajax/check_ip_kisekae.php` the log shows `GET /mypage_top.php`, one request, and never a second post. The write stops before its save. |
| `/__post-redirect?status=307` (then 308), then save. | Exactly one `POST /ajax/check_ip_kisekae.php` in the log and nothing after it: the answer was handed back unfollowed, and the write stops before its save. |
| `/__post-redirect?status=302&rotate=1`, then save. | The redirect carries a new `_token_v2` and ends the old one. The request after the post, and every later one, carries the new token (the old one no longer works), a read after it succeeds, and after the app is killed and reopened it is still signed in. This is the row that shows whether Android stores a cookie set on an answer it did not follow. |
| `/__noop-save`; `/__next-result?code=705`; `/__expire-on-save`; each then save. | `notApplied`, unchanged; `notApplied` refused with code 705, and no second post; `sessionGone` after the save, with the pending write kept. |
| Swipe the app away right after "Saved", reopen it, open the Costume page. | Still signed in. The page reads the editor and offers **Undo last costume change** with its time, and Undo restores the set. |
| Background the app for ten seconds while a save is held (`/__hold-precheck?on=1`). | The write finishes when the app returns, or, if Android killed it, opening the Costume page settles it. |
| Long-press the portrait (do this one on a release build first: it needs no write). | The Costume page opens, with no context menu, no selection and no odd vibration. |

### The first real Android write

Made by you, with your own account, in the app, on the debug APK on your tablet and your PC (your
call, 2026-10-02). No agent presses Sign in, Save or Undo against the real site. Start with a
colour, then a きぐるみ and its undo. The desktop's costume writes have been made for real; the
Android ones have not, so until yours is recorded an Android costume write also reads your title on
my page before and after.

**Before.**

- [ ] The rehearsal above passed.
- [ ] The time is outside 05:00–07:00 JST (the app refuses inside it too).
- [ ] Nothing else changes this costume during the test: not the desktop app, not the site (an undo stops if the set moved).
- [ ] Build and install the debug app: `bun run android:run -- <adb serial>`. Its home-screen entry reads "A Better Taiko Hiroba (debug)".
- [ ] Clear that app's data (Settings > Apps > the debug app > Storage), so no stand-in state is left.
- [ ] Turn wireless debugging off, and run no `run-as` and no DevTools until the test is over (see [Signing in for real](#signing-in-for-real)).
- [ ] Sign in, in the app. Settings shows who is signed in.

**Part 1: one colour.**

1. [ ] The Overview reads your page (one request). The My Don portrait shows a small edit badge.
2. [ ] Long-press the portrait for about half a second (a tap does nothing; the menu's Costume entry goes to the same page). The Costume page opens and reads the editor (`mypage_kisekae.php`) and Hiroba's picture of the set (`imgsrc_mydon.php`). Note any Android menu or vibration.
3. [ ] Under いろ, each of かお, どう and てあし outlines the colour you wear; **Changes** says "Nothing changed yet."
4. [ ] Pick a different colour for かお only. **Changes** lists exactly one line, such as `かお: #8 → #3`. Touch nothing under きせかえ.
5. [ ] **Review**, then **Save to Hiroba** (the bar at the bottom). It reads "Saving… then reading it back". The app sends six requests, once each, in this order (the tablet does not show them; the rehearsal did): `GET mypage_top.php`, `GET mypage_kisekae.php`, `POST ajax/check_ip_kisekae.php`, `POST ajax/change_mydon.php`, `GET mypage_kisekae.php`, `GET mypage_top.php`.
6. [ ] The result is "Saved. Hiroba now shows the new costume.", in green, with **Undo last costume change** and when it was made under it. Compare with Hiroba's own site or app.
7. [ ] **Kill test.** Before pressing Undo, swipe the app away in Recents and reopen it. It must open signed in and read your page. Open the Costume page: it reads the editor, and must offer **Undo last costume change** with the time.
8. [ ] Press **Undo last costume change**. It reads "Undoing… then reading it back", then "Undone. Hiroba shows the costume as it was." Check all eight values on Hiroba's side.

**Part 2: a きぐるみ and its undo.**

9. [ ] On the Costume page, under きせかえ, pick a きぐるみ you own. The warning says it takes off あたま, からだ, メイク and ぷちキャラ; **Changes** lists those removals.
10. [ ] Review and save as in step 5. Hiroba shows the きぐるみ with the four slots empty. The picture on the page and the portrait match.
11. [ ] **Undo last costume change.** One save restores all eight values. Check on Hiroba's side.
12. [ ] **Read again** (the round button, or pull the page down): **Changes** says "Nothing changed yet." and the values are as they were before step 4.

**If something else shows.**

- "Hiroba didn't accept the app's request. Nothing was changed.": the pre-check did not answer `false`. Stop and keep the code shown.
- "Hiroba refused the change (code 705)", with Hiroba's own words 更新に失敗しました。再度画面の読み込みを行ってください。: stop, and do not retry. On the desktop this meant the token was not from the last page read before the posts, which is fixed there. Report the codes.
- "Couldn't read the result back" or "The app stopped before it knew how this ended": use **Read again** on the Costume page and look at the values before anything else.
- Asked to sign in again after the kill test: report it.

**Report to the session.** The outcome text and the codes on screen; the Changes lines; whether Hiroba's own screen agrees; the long-press behaviour; whether the kill test kept the session and the undo. The session records it with the other executed writes and in the wiki.

**After.** Undo anything left. Sign out. Uninstall the debug app (its data, with the undo records, goes with it, so only after the undo). Then, in a commit of its own, `LIVE_CHECKED_WRITES.android` lists `costume`, with the test that holds both lists.

### The first real title and name writes

Made by you, with your own account, in the app, on a plain `bun run dev -- --real` or on the debug
APK, with no flag of any kind to set (`ABTH_DEBUG_SAVE_READS=1` only keeps each answer in the debug
folder, `debug\history`, if you want to look at them afterwards). No agent presses Sign in, Save or
Undo against the real site. Both kinds are open; until yours are recorded, a title write also reads
your costume before and after, and a rename your title.

**Before.**

- [ ] The time is outside 05:00–07:00 JST (the app refuses inside it too).
- [ ] Any other copy of the app is closed, and nothing else changes your title or name meanwhile
  (an undo stops if it moved).
- [ ] Sign in, in the app. Settings shows who is signed in.

**Part 1: the list.**

1. [ ] Open **Name & title**. The app reads the page's one list (`mypage_title_edit.php`) once and
   posts nothing. The count under the picker is the number of titles you own. Exactly one title is
   marked **Current** if your title's name is unique, and several if it is shared.
2. [ ] If the app says "unexpected page" with codes, stop and send the codes: its parser refused
   something real. The debug copy `mypage_title_edit.php.html` should hold `#title_parts_comp`,
   reading like your title on my page.

**Part 2: a title and its undo.**

3. [ ] Pick another title whose name is unique (the app shows a number beside a name that repeats),
   **Review**, **Save to Hiroba**. The app sends six requests, once each (the tablet does not show
   them): `GET mypage_kisekae.php`, `GET mypage_title_edit.php`, `POST ajax/check_ip_title.php`,
   `POST ajax/change_mydon_profile.php`, `GET mypage_top.php`, `GET mypage_kisekae.php`, then my page
   once more for the plate. The result is "Saved. Hiroba now shows the new title.", the plate shows
   it, and your costume is as it was. In the debug history, the pre-check answered `{"result":false}`
   and the save a result of 0 with the new title's number in `detail.value`.
4. [ ] **Undo last title change.** The title you had comes back, in one save; the undo is gone.
5. [ ] Optional: pick a title whose name several share, save, then look at the undo: it is shut and
   says the previous title's name is shared, and nothing is sent.

**Part 3: the name.**

6. [ ] On the Name section, pick a name you are happy to keep, within the help page's rule: hiragana,
   at most five characters, nothing that resembles a real name (Hiroba warns against it). The field
   starts as your current name. **Review**, read the warning, **Save to Hiroba**. Five requests,
   once each: `GET mypage_top.php` twice, `POST ajax/change_mydon_profile.php` (the fields `_tckt`,
   `mode`, `oldName`, `newName`, in that order), then `GET mypage_top.php` twice. The result is
   "Saved. Hiroba now shows the new name.", the plate shows it, and your title is as it was.
7. [ ] Optional, your call: **Change the name back** at once. Hiroba either takes it or refuses it
   in its own words, which the page shows; a second rename within a minute or two may be refused.
   If it is, the account stays on the new name, which is why step 6's name is one you would keep.

**If something else shows.**

- "Hiroba didn't accept the app's request. Nothing was changed." at the title's pre-check: the
  pre-check did not answer `false`. Stop and keep the code shown.
- A result of `diverged` or `notApplied`, or a refusal with Hiroba's own words: stop, keep the codes
  and the words, and do not write again until they have been looked at.
- A code 705 at either save: the token was not the one from the last read before the post. Stop and
  report it with the order of the requests.

**Report to the session.** The outcome text and the codes on screen; the Changes lines; whether
Hiroba's own screen agrees; whether a second rename was taken or refused, and in what words. The
session records them with the other executed writes and in the wiki. Then, in commits of their own,
`LIVE_CHECKED_WRITES` lists `title` and `name` for the platform they were made on, with the test
that holds both lists.

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
  origin, so a run against the stand-in keeps its pictures, and its undo records (`abth-undo`, a
  database of its own that no `PICTURE_EPOCH` clears), apart from the installed build's.

Nothing in the app deletes a picture but a new `PICTURE_EPOCH` in
`src/hiroba-session/picture-store.ts`: the next launch clears whatever an older one kept. To clear
them by hand, delete the `pictures` folder, or clear the Android app's data.

## Signing in for real

Debug builds let any computer paired with the device over adb open the app's WebViews in DevTools
and read its files with `run-as`. The first real Android write is made on the debug APK, on your
own tablet and PC (your call, 2026-10-02). So:

- Sign in with a real account on the signed release build (`android:keystore` once, then
  `android:release` and `android:install-release`), or on the debug APK for the first real
  Android write ([The first real Android write](#the-first-real-android-write) says how). On
  Windows, use the packaged or portable exe.
- Turn wireless debugging off before a real sign-in on a debug build, and never run `run-as` or
  DevTools against the app while a real session exists on the device.
- Uninstall the debug build, or clear its data, once the test is over, after the undo.

Automated checks and agents never press "Sign in" against the real sites: not in a packaged build,
not under `dev -- --real`, not on a release APK and not on the debug APK. The end-to-end run and
the smoke test use the stand-in or stop at the first screen.
