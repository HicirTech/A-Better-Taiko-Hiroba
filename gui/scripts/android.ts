/** The Android build and run workflow behind the android:* package scripts. */
import { join } from "node:path";

const DEV_PORT = "5173";
const root = join(import.meta.dir, "..");
const android = join(root, "android");
// Windows' NoDefaultCurrentDirectoryInExePath stops cmd.exe finding gradlew, which Capacitor needs.
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
    // Capacitor points its copied config at http://<LAN IP>:5173 (cleartext), and puts it back
    // on Ctrl+C or at the next cap sync.
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
