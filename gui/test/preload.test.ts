import { describe, expect, test } from "bun:test";

import { ELECTRON_BUILD } from "../scripts/electron-build";
import { BRIDGE_CHANNELS, PICTURE_CHANNELS } from "../src/shared/session-port/bridge-channels";
import type { HirobaSessionPort } from "../src/shared/session-port/types";

type Forwarder = (...args: unknown[]) => Promise<unknown>;

const { outdir: _outdir, sourcemap: _sourcemap, ...inMemory } = ELECTRON_BUILD;
const built = await Bun.build(inMemory);
const preloadText =
  (await built.outputs.find((output) => output.path.endsWith("preload.cjs"))?.text()) ?? "";

const invoked: unknown[][] = [];
const exposed = new Map<string, Record<string, Forwarder>>();
const electron = {
  contextBridge: {
    exposeInMainWorld: (name: string, api: Record<string, Forwarder>) => exposed.set(name, api),
  },
  ipcRenderer: {
    invoke: async (...args: unknown[]) => {
      invoked.push(args);
    },
  },
};
// The preload as it ships, run beside a stand-in electron: other tests load the real package.
const shipped = { exports: {} };
new Function("require", "module", "exports", preloadText)(
  (name: string) => (name === "electron" ? electron : {}),
  shipped,
  shipped.exports,
);
const port = exposed.get("abth") ?? {};
const pictures = exposed.get("abthPictures") ?? {};

/** How many arguments each call carries to the main process. */
const ARGUMENTS: Record<keyof HirobaSessionPort, number> = {
  isSignedIn: 0,
  signIn: 0,
  cancelSignIn: 0,
  readProfile: 1,
  refreshHiroba: 0,
  signOut: 0,
  openCostumeEditor: 0,
  openTitleEditor: 0,
  previewCostume: 1,
  readPicture: 2,
  changeCostume: 1,
  changeTitle: 1,
  changeName: 1,
  costumeHistory: 0,
  readUpdateFeed: 0,
  openFavorites: 0,
  changeFolder: 1,
  changeFavoriteSong: 1,
  folderHistory: 0,
  readSongPicker: 0,
  scores: 0,
  listedCharts: 0,
  readScores: 0,
  readEveryScore: 0,
  readSongScores: 2,
  scoresProgress: 0,
  readSongCatalogue: 1,
  readChineseNames: 0,
  readRatingData: 1,
  ratingHistory: 1,
  keepRating: 2,
  readChartPicture: 2,
  readCdnChart: 3,
  readChartDensity: 2,
  readChartTja: 1,
  readDrawnChart: 2,
  keepDrawnChart: 3,
  readPipelines: 1,
};

describe("the desktop's preload", () => {
  test("requires no module but electron, as a sandboxed preload can load no other", () => {
    expect(built.success).toBe(true);
    expect([...new Set(preloadText.match(/require\("[^"]+"\)/g))]).toEqual(['require("electron")']);
  });

  test("lays out every call of the port, each on a channel of its own, and nothing else", () => {
    const channels = Object.values(BRIDGE_CHANNELS);

    expect(Object.keys(port).sort()).toEqual(Object.keys(BRIDGE_CHANNELS).sort());
    expect(new Set(channels).size).toBe(channels.length);
  });

  test.each(Object.entries(ARGUMENTS))(
    "sends %s on its channel with its %i arguments, and none past them",
    async (call, count) => {
      invoked.length = 0;
      const given = Array.from({ length: count + 1 }, (_, index) => `${call} ${index}`);
      await port[call]?.(...given);

      expect(invoked).toEqual([
        [BRIDGE_CHANNELS[call as keyof HirobaSessionPort], ...given.slice(0, count)],
      ]);
    },
  );

  test("leaves out a last argument left undefined where the main process refuses one", async () => {
    invoked.length = 0;
    await port.readProfile?.(undefined);
    await port.readPicture?.("want", undefined);

    expect(invoked).toEqual([[BRIDGE_CHANNELS.readProfile], [BRIDGE_CHANNELS.readPicture, "want"]]);
  });

  test("hands a picture to the clipboard or to a file on their own channels", async () => {
    invoked.length = 0;
    await pictures.copy?.("png", "past");
    await pictures.save?.("webp", "name", "past");

    expect(invoked).toEqual([
      [PICTURE_CHANNELS.copy, "png"],
      [PICTURE_CHANNELS.save, "webp", "name"],
    ]);
  });
});
