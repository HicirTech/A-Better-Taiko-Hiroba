/**
 * The Android workflow, so nobody has to remember it:
 *
 *   bun run android:apk                             web build, cap sync, debug APK
 *   bun run android:run -- <adb serial>             the same, then install and start it there
 *   bun run android:live -- <adb serial> <LAN IP>   Vite's dev server, and the app loading it
 *   bun run android:keystore                        a local release key, once per machine
 *   bun run android:release                         web build, cap sync, signed release APK
 *   bun run android:install-release -- <serial>     install the signed release APK there
 *
 * Debug builds let any adb-paired computer read the app's WebViews and files (DevTools, run-as),
 * so a real sign-in belongs on the release build. The release key and its passwords live in
 * android/keystore.properties and android/abth-local.jks, both git-ignored.
 *
 * Live reload rewrites the copied Capacitor config to load http://<LAN IP>:5173 with cleartext
 * allowed; Capacitor puts it back when this is stopped with Ctrl+C, or at the next `cap sync`. It
 * only runs against the local stand-in: both VITE_ABTH_DEV_* endpoints must be set.
 *
 * Windows' NoDefaultCurrentDirectoryInExePath stops cmd.exe finding `gradlew` in the current
 * folder, which is how Capacitor starts Gradle, so it is removed from every child's environment.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const DEV_PORT = "5173";
const APPLICATION_ID = "com.hicirtech.taikohiroba";
const root = join(import.meta.dir, "..");
const android = join(root, "android");
const keystoreProperties = join(android, "keystore.properties");
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
    if (existsSync(keystoreProperties)) {
      fail("android/keystore.properties exists already; a second key would orphan installs.");
    }
    // One random password for store and key, kept only in the git-ignored properties file.
    const password = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
    run(
      [
        "keytool",
        "-genkeypair",
        "-keystore",
        "abth-local.jks",
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
      ],
      android,
    );
    await Bun.write(
      keystoreProperties,
      `storeFile=abth-local.jks\nstorePassword=${password}\nkeyAlias=abth\nkeyPassword=${password}\n`,
    );
    process.stdout.write("Wrote android/abth-local.jks and android/keystore.properties.\n");
    break;
  }
  case "release":
    if (!existsSync(keystoreProperties)) {
      fail("No release key: run `bun run android:keystore` once first.");
    }
    buildApk("assembleRelease");
    break;
  case "install-release":
    if (serial === undefined) {
      fail("Usage: bun run android:install-release -- <adb serial>");
    }
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
      "Usage: bun scripts/android.ts apk | run <serial> | live <serial> <LAN IP> | keystore | release | install-release <serial>",
    );
}
