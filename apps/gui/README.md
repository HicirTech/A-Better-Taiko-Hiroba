# @abth/gui

The desktop and Android app of A Better Taiko Hiroba. One React and Material UI web bundle runs in
two shells: Electron on Windows, Capacitor on Android. It signs in to Donder Hiroba on Hiroba's own
pages and reads your own page: one request per read, and one more for your dan label when the page
shows one, since the page gives the dan only as that picture. It shows your nickname, title, region
and dan, your crowns with cleared and full-combo totals, the seven score ranks by tier, the season's
どんメダル plate, and your favourite songs. On the desktop it can also change your costume
(きせかえ), but only in a development run opened for it, until the first real write has been made
and recorded (see [The first real costume write](#the-first-real-costume-write)).

The app id is `com.hicirtech.taikohiroba` on both platforms. Android debug builds are
`com.hicirtech.taikohiroba.debug`, labelled "A Better Taiko Hiroba (debug)", so a debug and a release
build can sit on one device side by side.

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
| `bun run dev` | Starts the local stand-in for Hiroba (`scripts/mock-hiroba.ts`), Vite's dev server and Electron. Nothing reaches the real sites. |
| `bun run dev -- --real` | The same against the real Hiroba and Bandai Namco ID. Only for a person signing in with their own account. |
| `bun run build` | The web bundle (`out/web`) and Electron's main process and preload (`out/electron`). CI runs this. |
| `bun run start` | Runs the last build in Electron. |
| `bun run e2e:desktop` | Builds, then drives sign-in, reading, reading again, a rotated session, a lost session, cancel and sign-out against the stand-in, with a dan read off its label and a label that does not read. With the write gate open, it changes a colour and a きぐるみ and undoes each, and checks each write sent exactly the requests planned; it tries the #22 trap, a save that moves nothing, pre-checks that stop, a post sent to the login page, an undo after a change made elsewhere, a session that ends before and after a save, and Hiroba's daily break; and reopened without the flag, it checks no write can be sent. It then searches the app's data folder for anything the session left behind, and for every form token the stand-in handed out. In the report it prints, every check is `true` except `tokenInRendererDom` and `partitionsFolder`, which are `false`; the my-page read counts are `1`, `2` and `1`; and `userDataHits` is empty. |
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable exe in `release/`. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in", and refuses to start at all while the packaged app keeps a session in `%APPDATA%\A Better Taiko Hiroba`, since the app would then read the real Hiroba by itself. |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app.

The installers are not code-signed, so Windows SmartScreen warns before the first run.

### Writes

The desktop app can change one thing on Hiroba so far: the costume. No kind of write has been
verified against the real site yet, so **no packaged build can send one**. A kind that is not
verified opens only in an unpackaged run started with `ABTH_UNVERIFIED_WRITES=1`; a packaged build
ignores that variable. Android sends no write at all for now.

Every write goes the same way: read the editor for a fresh form token and the whole set, keep an
undo record in `undo.json` in the app's data folder, send the pre-check, send the save exactly
once, and read the whole set back. The set read back decides the outcome, not Hiroba's answer.
While a kind is not verified, each write also reads your title on my page before and after. No
request is retried, and nothing is sent between 05:00 and 07:00 JST, Hiroba's daily maintenance.

Two more variables apply to unpackaged runs only: `ABTH_DEV_NOW` (an ISO time) fixes the clock the
maintenance check uses, for tests, and `ABTH_DEBUG_SAVE_READS=1` keeps each page a read brings back
in the data folder's `debug` folder, named after the page, with every form token replaced by
`<tckt>`. Posts are never kept there.

## The first real costume write

The first real write of each kind is made by you, on the desktop, with your own account. Start with
a single colour. The app has only ever written to the stand-in; this checks that Hiroba accepts a
post from the app at all.

**Before you start.** Pick a time outside 05:00–07:00 JST. Close any other copy of the app. The run
below uses the same data folder as the installed app, `%APPDATA%\A Better Taiko Hiroba`, so it
opens signed in if you are signed in there.

**1. Start the development run with the gate open.** From this folder, in Git Bash:

```bash
ABTH_UNVERIFIED_WRITES=1 ABTH_DEBUG_SAVE_READS=1 bun run dev -- --real
```

or in PowerShell:

```powershell
$env:ABTH_UNVERIFIED_WRITES = "1"; $env:ABTH_DEBUG_SAVE_READS = "1"; bun run dev -- --real
```

The app reads your page as usual (sign in first if it asks). The identity card now has a
**Change costume** button; only a run started this way shows it.

**2. Open the editor and check it.** Press **Change costume**: one read of `mypage_kisekae.php`.
Under **いろ**, each of かお, どう and てあし outlines the colour you wear; under **きせかえ**, each slot
highlights the item you wear, or はずす. **Changes** says "Nothing changed yet."

**3. Change one colour, and nothing else.** Under いろ, pick かお (or どう, or てあし) and press a
different swatch. **Changes** must list exactly one line, such as `かお: #8 → #3`. Do not touch
きせかえ.

**4. Review and save.** Press **Review**. The dialog repeats the one change, and asks you to tick
"This is the first write of this kind from the app…", noting that it also reads your title before
and after. Tick it and press **Save to Hiroba**. The dialog shows "Saving… then reading it back"
while the app sends, in this order and once each:

1. `GET mypage_kisekae.php`: a fresh token and the whole set, checked against what the editor showed;
2. `GET mypage_top.php`: your title, before;
3. `POST ajax/check_ip_kisekae.php`: the pre-check, which changes nothing; only the answer
   `{"result":false}` lets the app go on;
4. `POST ajax/change_mydon.php`: the save, sent once;
5. `GET mypage_kisekae.php`: the whole set read back;
6. `GET mypage_top.php`: your title, after.

**5. Read what it says.**

- "Saved. Hiroba now shows the new costume.", in green, and a Snackbar offering **Undo**: it
  worked. The read-back shows exactly the one colour changed and the title unchanged.
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
(`mypage_kisekae.php.html`, `mypage_top.php.html`, `imgsrc_danlabel.php.png` and a `.json` for
each), with each form token replaced; they carry your nickname and taiko number, so delete them
once they are not needed.
`undo.json` there holds the last write's undo record, your taiko number included, and no token.

**Then.** Tell the session the outcome, the codes shown if any, so the write is recorded with the
other executed writes and in the wiki. The next check is a きぐるみ and its undo, the same way;
after both, costume writes can be marked verified for the desktop in a commit of their own, and
only then can a packaged build send them.

## Android

| Script | What it does |
|---|---|
| `bun run android:apk` | Web build, `cap sync`, debug APK. |
| `bun run android:run -- <adb serial>` | The same, then installs and starts it on that device. |
| `bun run android:live -- <adb serial> <LAN IP>` | Vite's dev server on this computer, and the debug app loading it with live reload. It runs only against the stand-in, and refuses to start unless both `VITE_ABTH_DEV_HIROBA_ORIGIN` and `VITE_ABTH_DEV_IDP_HOST` are set. |
| `bun run android:keystore` | Makes the local release key, once per machine. It refuses to run if a key exists. |
| `bun run android:release` | Web build, `cap sync`, signed release APK. It refuses to run without the key. |
| `bun run android:install-release -- <adb serial>` | Installs the signed release APK on that device and starts it. |

To run the debug app against the stand-in on a device, start the stand-in on this computer's LAN
address first:

```bash
ABTH_MOCK_IP=<LAN IP> bun scripts/mock-hiroba.ts
VITE_ABTH_DEV_HIROBA_ORIGIN=http://hiroba.<LAN IP>.sslip.io:8807 \
VITE_ABTH_DEV_IDP_HOST=id.<LAN IP>.sslip.io:8808 \
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
cleared when the window closes. The cookie is kept only in the main process's memory. Signing out
or closing the app forgets it; nothing reaches the disk.

**Android.** The sign-in runs in the in-app browser, which shares the app's WebView cookie store,
and Capacitor's native HTTP client reads Hiroba through that same store. The app wipes every
cookie at each launch, when a sign-in starts, when one is cancelled or cannot open, at sign-out,
and when a read finds the session gone. Between a sign-in and the next sign-out or launch, the
app's private storage holds:

- `_token_v2`, in plain text, in the WebView cookie database (`app_webview/Default/Cookies`);
- the Bandai Namco ID host's Domain cookies (its host-only cookies are cleared after sign-in);
- the WebView's HTTP cache, which is cleared when the next sign-in browser opens;
- web storage of donderhiroba.jp and bandainamcoid.com, which the app cannot clear.

This is an accepted exception to the rule that the session is never stored in plain text. The app
turns off Android backup and device transfer for all of its data, so none of it leaves the device
that way.

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
