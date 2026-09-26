/**
 * The desktop dev loop: Vite's dev server for the renderer (hot reload) runs inside this Bun
 * process; Electron's main process is rebuilt and Electron restarted when its code changes.
 *
 *   bun run dev
 */
import { watch } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";
import { createServer } from "vite";

const root = join(import.meta.dir, "..");

const vite = await createServer({ configFile: join(root, "vite.config.ts"), root });
await vite.listen();
const devServerUrl = vite.resolvedUrls?.local[0] ?? "http://localhost:5173/";

const buildElectron = () =>
  Bun.spawnSync(["bun", join(root, "scripts", "build-electron.ts")], { cwd: root }).exitCode === 0;

let electron: ReturnType<typeof Bun.spawn> | null = null;
function startElectron() {
  electron?.kill();
  electron = Bun.spawn([String(electronPath), root], {
    cwd: root,
    env: { ...process.env, ABTH_DEV_SERVER_URL: devServerUrl },
    stdout: "inherit",
    stderr: "inherit",
  });
}

process.on("exit", () => {
  electron?.kill();
});

if (!buildElectron()) {
  process.exit(1);
}
startElectron();

let pending: ReturnType<typeof setTimeout> | undefined;
for (const dir of ["electron", join("src", "hiroba-session"), join("src", "session-port")]) {
  watch(join(root, dir), { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => buildElectron() && startElectron(), 150);
  });
}
