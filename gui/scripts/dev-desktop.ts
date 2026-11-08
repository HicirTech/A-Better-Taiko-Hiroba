/** The desktop dev loop: Vite for the renderer, Electron restarted when main or preload change. */
import { watch } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";
import { createServer } from "vite";
import { mockAddressOf, mockOrigins, thirdPartyEnvironment } from "./mock-origins";

const root = join(import.meta.dir, "..");
const real = process.argv.includes("--real");
const origins = mockOrigins(mockAddressOf(process.env));

const mock = real
  ? null
  : Bun.spawn(["bun", join(root, "scripts", "mock-hiroba.ts")], {
      env: { ...process.env, ...origins.mockEnvironment },
      stdout: "inherit",
      stderr: "inherit",
    });
// An unpackaged build reads the song lists, the rating data and the chart files only from the
// addresses it is given.
const appEnv = real
  ? thirdPartyEnvironment(null)
  : {
      ...origins.appEnvironment,
      // Not the installed app's %APPDATA%: its real session and history would meet the mock.
      ABTH_DEV_USER_DATA: join(root, "out", "dev-user-data"),
    };

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
    env: { ...process.env, ...appEnv, ABTH_DEV_SERVER_URL: devServerUrl },
    stdout: "inherit",
    stderr: "inherit",
  });
}

process.on("exit", () => {
  electron?.kill();
  mock?.kill();
});

if (!buildElectron()) {
  process.exit(1);
}
startElectron();

let pending: ReturnType<typeof setTimeout> | undefined;
for (const dir of [
  "electron",
  join("src", "hiroba-session"),
  join("src", "session-port"),
  join("src", "song-catalogue"),
  join("src", "updates"),
]) {
  watch(join(root, dir), { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => buildElectron() && startElectron(), 150);
  });
}
