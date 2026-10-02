/**
 * The Android workflow, so nobody has to remember it:
 *
 *   bun run android:apk                             web build, cap sync, debug APK
 *   bun run android:run -- <adb serial>             the same, then install and start it there
 *   bun run android:live -- <adb serial> <LAN IP>   Vite's dev server, and the app loading it
 *   bun run android:release                         web build, cap sync, release APK
 *
 * Debug builds let any adb-paired computer read the app's WebViews and files (DevTools, run-as).
 * The release APK is signed when RELEASE_KEYSTORE_FILE is set, with RELEASE_KEYSTORE_PASSWORD,
 * RELEASE_KEY_ALIAS and RELEASE_KEY_PASSWORD (build.gradle reads them), and is unsigned otherwise.
 *
 * Live reload rewrites the copied Capacitor config to load http://<LAN IP>:5173 with cleartext
 * allowed; Capacitor puts it back when this is stopped with Ctrl+C, or at the next `cap sync`. It
 * only runs against the local stand-in: both VITE_ABTH_DEV_* endpoints must be set.
 *
 * Windows' NoDefaultCurrentDirectoryInExePath stops cmd.exe finding `gradlew` in the current
 * folder, which is how Capacitor starts Gradle, so it is removed from every child's environment.
 */
import { join } from "node:path";

const DEV_PORT = "5173";
const root = join(import.meta.dir, "..");
const android = join(root, "android");
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
  case "release":
    buildApk("assembleRelease");
    break;
  default:
    fail("Usage: bun scripts/android.ts apk | run <serial> | live <serial> <LAN IP> | release");
}
