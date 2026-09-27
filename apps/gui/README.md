# @abth/gui

The desktop and Android app of A Better Taiko Hiroba. One React and Material UI web bundle runs in
two shells: Electron on Windows, Capacitor on Android. It signs in to Donder Hiroba on Hiroba's own
pages and reads your own page, one request per read. It shows your nickname, title and region, your
crowns with cleared and full-combo totals, the seven score ranks by tier, the season's どんメダル
plate, and your favourite songs.

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
| `bun run e2e:desktop` | Builds, then drives sign-in, reading, reading again, a rotated session, a lost session, cancel and sign-out against the stand-in. It then searches the app's data folder for anything the session left behind. In the report it prints, every check is `true` except `tokenInRendererDom` and `partitionsFolder`, which are `false`; the read counts are `1` and `2`; and `userDataHits` is empty. |
| `bun run dist:dir` | A packaged app in `release/win-unpacked`. |
| `bun run dist:win` | An NSIS installer and a portable exe in `release/`. |
| `bun run smoke:packaged` | Starts `release/win-unpacked` and checks its first screen. It never presses "Sign in". |

A packaged build talks only to the real sites. The stand-in is reachable only from an unpackaged
build, and only when both `ABTH_DEV_HIROBA_ORIGIN` and `ABTH_DEV_IDP_HOST` are set; one without the
other stops the app.

The installers are not code-signed, so Windows SmartScreen warns before the first run.

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
