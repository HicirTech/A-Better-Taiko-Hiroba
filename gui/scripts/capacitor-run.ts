/** What the android:* and ios:* package scripts share: running tools, and Vite with live reload. */
import { join } from "node:path";

const DEV_PORT = "5173";
export const guiRoot = join(import.meta.dir, "..");
// Windows' NoDefaultCurrentDirectoryInExePath stops cmd.exe finding gradlew, which Capacitor needs.
const { NoDefaultCurrentDirectoryInExePath: _dropped, ...env } = process.env;

export function run(argv: string[], cwd = guiRoot): void {
  const { exitCode } = Bun.spawnSync(argv, { cwd, env, stdout: "inherit", stderr: "inherit" });
  if (exitCode !== 0) {
    process.exit(exitCode ?? 1);
  }
}

export function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

export function buildWeb(platform: "android" | "ios"): void {
  run(["bun", "run", "build:web"], join(guiRoot, ".."));
  run(["bun", "x", "cap", "sync", platform]);
}

/** Runs the app from Vite's dev server on `target`, which reaches it at `host`, for the stand-in. */
export function runLive(platform: "android" | "ios", target: string, host: string): void {
  if (!env.VITE_ABTH_DEV_HIROBA_ORIGIN || !env.VITE_ABTH_DEV_IDP_HOST) {
    fail(
      "Live reload runs only against the local stand-in: set VITE_ABTH_DEV_HIROBA_ORIGIN and VITE_ABTH_DEV_IDP_HOST.",
    );
  }
  const vite = Bun.spawn(
    ["bun", "--bun", "vite", "--host", "0.0.0.0", "--port", DEV_PORT, "--strictPort"],
    { cwd: guiRoot, env, stdout: "inherit", stderr: "inherit" },
  );
  // Capacitor points its copied config at http://<host>:5173 (cleartext), and puts it back on
  // Ctrl+C or at the next cap sync.
  try {
    run([
      "bun",
      "x",
      "cap",
      "run",
      platform,
      "--target",
      target,
      "--live-reload",
      "--host",
      host,
      "--port",
      DEV_PORT,
    ]);
  } finally {
    vite.kill();
  }
}
