import { describe, expect, test } from "bun:test";

import { ELECTRON_BUILD } from "../scripts/electron-build";
import { PICTURE_CHANNELS } from "../src/shared/session-port/bridge-channels";
import { PORT_CALLS } from "../src/shared/session-port/port-calls";
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

describe("the desktop's preload", () => {
  test("requires no module but electron, as a sandboxed preload can load no other", () => {
    expect(built.success).toBe(true);
    expect([...new Set(preloadText.match(/require\("[^"]+"\)/g))]).toEqual(['require("electron")']);
  });

  test("lays out every call of the port, each on a channel of its own, and nothing else", () => {
    const channels = Object.values(PORT_CALLS).map(({ channel }) => channel);

    expect(Object.keys(port).sort()).toEqual(Object.keys(PORT_CALLS).sort());
    expect(new Set(channels).size).toBe(channels.length);
  });

  test.each(Object.entries(PORT_CALLS).map(([call, { takes }]): [string, number] => [call, takes]))(
    "sends %s on its channel with its %i arguments, and none past them",
    async (call, count) => {
      invoked.length = 0;
      const given = Array.from({ length: count + 1 }, (_, index) => `${call} ${index}`);
      await port[call]?.(...given);

      expect(invoked).toEqual([
        [PORT_CALLS[call as keyof HirobaSessionPort].channel, ...given.slice(0, count)],
      ]);
    },
  );

  test("leaves out a last argument left undefined where the main process refuses one", async () => {
    invoked.length = 0;
    await port.readProfile?.(undefined);
    await port.readPicture?.("want", undefined);

    expect(invoked).toStrictEqual([
      [PORT_CALLS.readProfile.channel],
      [PORT_CALLS.readPicture.channel, "want"],
    ]);
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
