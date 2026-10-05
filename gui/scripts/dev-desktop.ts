/** The desktop dev loop: Vite for the renderer, Electron restarted when main or preload change. */
import { watch } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";
import { createServer } from "vite";
import { CHINESE_NAMES_URL, SONG_CATALOGUE_URL } from "../src/song-catalogue";

const root = join(import.meta.dir, "..");
const real = process.argv.includes("--real");
const HIROBA_ORIGIN = "http://hiroba.127.0.0.1.sslip.io:8807";

const mock = real
  ? null
  : Bun.spawn(["bun", join(root, "scripts", "mock-hiroba.ts")], {
      stdout: "inherit",
      stderr: "inherit",
    });
const mockEnv = real
  ? {}
  : {
      ABTH_DEV_HIROBA_ORIGIN: HIROBA_ORIGIN,
      ABTH_DEV_IDP_HOST: "id.127.0.0.1.sslip.io:8808",
      ABTH_DEV_IMG_ORIGIN: "http://img.127.0.0.1.sslip.io:8807",
      ABTH_DEV_CHART_ORIGIN: HIROBA_ORIGIN,
      // Not the installed app's %APPDATA%: its real session and history would meet the mock.
      ABTH_DEV_USER_DATA: join(root, "out", "dev-user-data"),
    };
// An unpackaged build reads the song lists only from the addresses it is given.
const songCatalogueEnv = {
  ABTH_DEV_SONG_CATALOGUE: real ? SONG_CATALOGUE_URL : `${HIROBA_ORIGIN}/__song-catalogue`,
  ABTH_DEV_CHINESE_NAMES: real ? CHINESE_NAMES_URL : `${HIROBA_ORIGIN}/__chinese-names`,
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
    env: { ...process.env, ...mockEnv, ...songCatalogueEnv, ABTH_DEV_SERVER_URL: devServerUrl },
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
