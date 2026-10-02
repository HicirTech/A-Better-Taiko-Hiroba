/**
 * The Android workflow, so nobody has to remember it:
 *
 *   bun run android:apk                             web build, cap sync, debug APK
 *   bun run android:run -- <adb serial>             the same, then install and start it there
 *   bun run android:live -- <adb serial> <LAN IP>   Vite's dev server, and the app loading it
 *   bun run android:keystore                        the release key, once, in the keys folder
 *   bun run android:release                         web build, cap sync, signed release APK
 *   bun run android:release-unsigned                the same with no key, for CI's dry runs
 *   bun run android:install-release -- <serial>     install the signed release APK there
 *
 * Debug builds let any adb-paired computer read the app's WebViews and files (DevTools, run-as),
 * so a real sign-in belongs on the release build. The signing keys live in one folder outside the
 * clone, never in android/: the one ABTH_RELEASE_KEYS names, or W:/TaikoElaboation/release keys
 * (release-keys.ts has the rule, and build.gradle the same one). It holds the release key, which
 * android:keystore makes there once, and the debug key every machine shares.
 *
 * Live reload rewrites the copied Capacitor config to load http://<LAN IP>:5173 with cleartext
 * allowed; Capacitor puts it back when this is stopped with Ctrl+C, or at the next `cap sync`. It
 * only runs against the local stand-in: both VITE_ABTH_DEV_* endpoints must be set.
 *
 * Windows' NoDefaultCurrentDirectoryInExePath stops cmd.exe finding `gradlew` in the current
 * folder, which is how Capacitor starts Gradle, so it is removed from every child's environment.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  KEYS_FOLDER_VARIABLE,
  KEYSTORE_PROPERTIES,
  RELEASE_KEYSTORE,
  resolveKeysFolder,
} from "./release-keys";

const DEV_PORT = "5173";
const APPLICATION_ID = "com.hicirtech.taikohiroba";
const root = join(import.meta.dir, "..");
const android = join(root, "android");
const releaseApk = join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
const { NoDefaultCurrentDirectoryInExePath: _dropped, ...env } = process.env;
const [command, serial, lanIp] = process.argv.slice(2);

function run(argv: string[], cwd = root): void {
  const { exitCode } = Bun.spawnSync(argv, { cwd, env, stdout: "inherit", stderr: "inherit" });
  if (exitCode !== 0) {
    process.exit(exitCode ?? 1);
  }
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** The folder the signing keys live in. A variable that cannot name one ends the run. */
function keysFolder(): string {
  const keys = resolveKeysFolder(env);
  return keys.ok ? keys.folder : fail(keys.reason);
}

/** Gradle signs the release build exactly when the keys folder holds the key's settings. */
function hasReleaseKey(folder: string): boolean {
  return existsSync(join(folder, KEYSTORE_PROPERTIES));
}

/** A signed release needs the key; with none in the folder Gradle would leave the APK unsigned. */
function requireReleaseKey(folder: string): void {
  if (!hasReleaseKey(folder)) {
    fail(
      `No release key: ${folder} has no ${KEYSTORE_PROPERTIES}. Run \`bun run android:keystore\` once to make one there, or set ${KEYS_FOLDER_VARIABLE} to the folder that holds yours.`,
    );
  }
}

/** The keys folder of a place with no key yet may not exist; the first key makes it. */
function makeKeysFolder(folder: string): void {
  try {
    mkdirSync(folder, { recursive: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(
      `Cannot make ${folder}: ${reason}. Map its drive, or set ${KEYS_FOLDER_VARIABLE} to a folder you can write to.`,
    );
  }
}

function buildApk(task: "assembleDebug" | "assembleRelease"): void {
  run(["bun", "run", "build:web"]);
  run(["bun", "x", "cap", "sync", "android"]);
  const gradle =
    process.platform === "win32" ? ["cmd.exe", "/d", "/c", "gradlew.bat"] : ["./gradlew"];
  run([...gradle, task], android);
}

switch (command) {
  case "apk":
    buildApk("assembleDebug");
    break;
  case "run":
    if (serial === undefined) {
      fail("Usage: bun run android:run -- <adb serial>");
    }
    buildApk("assembleDebug");
    run(["bun", "x", "cap", "run", "android", "--no-sync", "--target", serial]);
    break;
  case "live": {
    if (serial === undefined || lanIp === undefined) {
      fail("Usage: bun run android:live -- <adb serial> <LAN IP>");
    }
    if (!env.VITE_ABTH_DEV_HIROBA_ORIGIN || !env.VITE_ABTH_DEV_IDP_HOST) {
      fail(
        "Live reload runs only against the local stand-in: set VITE_ABTH_DEV_HIROBA_ORIGIN and VITE_ABTH_DEV_IDP_HOST.",
      );
    }
    const vite = Bun.spawn(
      ["bun", "--bun", "vite", "--host", "0.0.0.0", "--port", DEV_PORT, "--strictPort"],
      { cwd: root, env, stdout: "inherit", stderr: "inherit" },
    );
    try {
      run([
        "bun",
        "x",
        "cap",
        "run",
        "android",
        "--target",
        serial,
        "--live-reload",
        "--host",
        lanIp,
        "--port",
        DEV_PORT,
      ]);
    } finally {
      vite.kill();
    }
    break;
  }
  case "keystore": {
    const keys = keysFolder();
    // A store without its settings file is a key too, one whose settings were not copied: a second
    // key would orphan installs just the same.
    const present = [KEYSTORE_PROPERTIES, RELEASE_KEYSTORE].filter((name) =>
      existsSync(join(keys, name)),
    );
    if (present.length > 0) {
      fail(`${keys} holds ${present.join(" and ")} already; a second key would orphan installs.`);
    }
    makeKeysFolder(keys);
    // One random password for store and key, kept only in keystore.properties, in the keys folder.
    const password = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
    run([
      "keytool",
      "-genkeypair",
      "-keystore",
      join(keys, RELEASE_KEYSTORE),
      "-storetype",
      "PKCS12",
      "-alias",
      "abth",
      "-keyalg",
      "RSA",
      "-keysize",
      "4096",
      "-validity",
      "10000",
      "-dname",
      "CN=A Better Taiko Hiroba local release",
      "-storepass",
      password,
      "-keypass",
      password,
    ]);
    await Bun.write(
      join(keys, KEYSTORE_PROPERTIES),
      `storeFile=${RELEASE_KEYSTORE}\nstorePassword=${password}\nkeyAlias=abth\nkeyPassword=${password}\n`,
    );
    process.stdout.write(`Wrote ${RELEASE_KEYSTORE} and ${KEYSTORE_PROPERTIES} in ${keys}.\n`);
    break;
  }
  case "release":
    requireReleaseKey(keysFolder());
    buildApk("assembleRelease");
    break;
  case "release-unsigned": {
    const keys = keysFolder();
    // Gradle signs the release build whenever keystore.properties is in the keys folder, so with
    // the key there this build would not be unsigned. Only a machine with no key, a CI dry run, has
    // a use for it.
    if (hasReleaseKey(keys)) {
      fail(
        `${keys} holds a release key, so Gradle would sign this: use \`bun run android:release\`, or set ${KEYS_FOLDER_VARIABLE} to a folder with none.`,
      );
    }
    buildApk("assembleRelease");
    break;
  }
  case "install-release":
    if (serial === undefined) {
      fail("Usage: bun run android:install-release -- <adb serial>");
    }
    requireReleaseKey(keysFolder());
    if (!existsSync(releaseApk)) {
      fail("No signed release APK: run `bun run android:release` first.");
    }
    run(["adb", "-s", serial, "install", "-r", releaseApk]);
    run([
      "adb",
      "-s",
      serial,
      "shell",
      "am",
      "start",
      "-n",
      `${APPLICATION_ID}/${APPLICATION_ID}.MainActivity`,
    ]);
    break;
  default:
    fail(
      "Usage: bun scripts/android.ts apk | run <serial> | live <serial> <LAN IP> | keystore | release | release-unsigned | install-release <serial>",
    );
}
