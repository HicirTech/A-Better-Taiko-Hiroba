import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Plugin } from "vite";

import config from "../.storybook/main";
import { PACK_VARIABLE, readStoryPack, storyPackPlugin } from "../.storybook/pack";

const PICTURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

const PLAYS = '[{"songTitle":"さいたま2000"}]';

function packFolder(pictures: Record<string, unknown>, manifest: object = {}): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-story-pack-"));
  folders.push(folder);
  mkdirSync(join(folder, "pictures"));
  writeFileSync(join(folder, "pictures", "rank-5.png"), PICTURE);
  mkdirSync(join(folder, "data"));
  writeFileSync(join(folder, "data", "plays.json"), PLAYS);
  writeFileSync(join(folder, "data", "broken.json"), "{");
  const pack = { format: "abth-story-pack", version: 1, label: "test", pictures, ...manifest };
  writeFileSync(join(folder, "pack.json"), JSON.stringify(pack));
  return folder;
}

const answer = (plugin: Plugin, id: string): unknown => {
  const resolveId = plugin.resolveId as (id: string) => string | null;
  const load = plugin.load as (id: string) => string | null;
  const resolved = resolveId(id);
  return resolved === null ? null : load(resolved);
};

describe("readStoryPack", () => {
  test("reads each listed picture by key, in base64", () => {
    const pack = readStoryPack(packFolder({ "rankIcon/5": "pictures/rank-5.png" }));
    expect(pack.label).toBe("test");
    expect(pack.pictures).toEqual({ "rankIcon/5": Buffer.from(PICTURE).toString("base64") });
    expect(pack.data).toEqual({});
  });

  test("reads each listed data file by name, as its text", () => {
    const pack = readStoryPack(packFolder({}, { data: { recentPlays: "data/plays.json" } }));
    expect(pack.data).toEqual({ recentPlays: PLAYS });
  });

  test("refuses a data file that is no JSON, or a name that is no data name", () => {
    const broken = packFolder({}, { data: { recentPlays: "data/broken.json" } });
    expect(() => readStoryPack(broken)).toThrow("recentPlays is no JSON");
    const named = packFolder({}, { data: { "recent-plays": "data/plays.json" } });
    expect(() => readStoryPack(named)).toThrow("no data name");
  });

  test.each(["../plays.json", "data/plays.png", "data\\plays.json"])(
    "refuses %p as a data file's path",
    (path) => {
      const folder = packFolder({}, { data: { recentPlays: path } });
      expect(() => readStoryPack(folder)).toThrow("inside the pack");
    },
  );

  test("refuses a manifest of another format or version", () => {
    expect(() => readStoryPack(packFolder({}, { format: "other" }))).toThrow("no abth-story-pack");
    expect(() => readStoryPack(packFolder({}, { version: 2 }))).toThrow("no abth-story-pack");
  });

  test.each([
    "../rank-5.png",
    "/pictures/rank-5.png",
    "C:/pictures/rank-5.png",
    "pictures\\rank-5.png",
    "./pictures/rank-5.png",
    "pictures/rank-5.gif",
    42,
  ])("refuses %p as a picture's path", (path) => {
    expect(() => readStoryPack(packFolder({ "rankIcon/5": path }))).toThrow("inside the pack");
  });

  test("refuses a key that is no picture key", () => {
    const folder = packFolder({ "../rankIcon": "pictures/rank-5.png" });
    expect(() => readStoryPack(folder)).toThrow("no picture key");
  });

  test("refuses a folder link that leads out of the pack", () => {
    const outside = mkdtempSync(join(tmpdir(), "abth-story-pack-outside-"));
    folders.push(outside);
    writeFileSync(join(outside, "rank-5.png"), PICTURE);
    const folder = packFolder({ "rankIcon/5": "linked/rank-5.png" });
    symlinkSync(outside, join(folder, "linked"), "junction");
    expect(() => readStoryPack(folder)).toThrow("leads out of the pack");
  });

  test("refuses a picture larger than any the app shows", () => {
    const folder = packFolder({ "rankIcon/5": "pictures/big.png" });
    writeFileSync(join(folder, "pictures", "big.png"), new Uint8Array(1024 * 1024 + 1));
    expect(() => readStoryPack(folder)).toThrow("larger than any the app reads");
  });
});

describe("storyPackPlugin", () => {
  test("answers the pack's module with null when no pack is named", () => {
    expect(answer(storyPackPlugin(null), "virtual:abth-story-pack")).toBe("export default null;");
    expect(answer(storyPackPlugin(null), "virtual:other")).toBeNull();
  });

  test("answers the pack's module with the pack", () => {
    const pack = { label: "test", pictures: { "rankIcon/5": "iVBORw0KGgo=" }, data: {} };
    expect(answer(storyPackPlugin(pack), "virtual:abth-story-pack")).toBe(
      `export default ${JSON.stringify(pack)};`,
    );
  });

  type Middleware = (
    request: object,
    response: { statusCode: number; end(): void },
    next: () => void,
  ) => void;

  // A request as the dev server's middleware gets it: from `address`, answered 0 until refused.
  const ask = (plugin: Plugin, address: string) => {
    const middlewares: Middleware[] = [];
    const configureServer = plugin.configureServer as (server: object) => void;
    configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });
    let status = 0;
    let passed = false;
    for (const middleware of middlewares) {
      const response = { statusCode: 0, end: () => (status = response.statusCode) };
      middleware({ socket: { remoteAddress: address } }, response, () => (passed = true));
    }
    return { middlewares: middlewares.length, status, passed };
  };

  test("with a pack, answers this machine alone", () => {
    const plugin = storyPackPlugin({ label: "test", pictures: {}, data: {} });
    for (const address of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      expect(ask(plugin, address)).toEqual({ middlewares: 1, status: 0, passed: true });
    }
    for (const address of ["192.168.1.20", "::ffff:192.168.1.20", "fe80::1"]) {
      expect(ask(plugin, address)).toEqual({ middlewares: 1, status: 403, passed: false });
    }
  });

  test("without a pack, leaves the dev server as it is", () => {
    expect(ask(storyPackPlugin(null), "192.168.1.20").middlewares).toBe(0);
  });
});

describe("the Storybook build", () => {
  const build = (env: string | undefined) => {
    const before = process.env[PACK_VARIABLE];
    if (env === undefined) {
      delete process.env[PACK_VARIABLE];
    } else {
      process.env[PACK_VARIABLE] = env;
    }
    const viteFinal = config.viteFinal as (
      viteConfig: object,
      options: { configType: string },
    ) => Promise<{ plugins?: unknown[] }>;
    return viteFinal({}, { configType: "PRODUCTION" }).finally(() => {
      if (before === undefined) {
        delete process.env[PACK_VARIABLE];
      } else {
        process.env[PACK_VARIABLE] = before;
      }
    });
  };

  test("refuses to build while a pack is named", async () => {
    await expect(build(packFolder({}))).rejects.toThrow("never goes into a build");
  });

  test("builds with the pack's module answering null", async () => {
    const { plugins = [] } = await build(undefined);
    const pack = plugins.find((plugin) => (plugin as Plugin).name === "abth-story-pack");
    expect(answer(pack as Plugin, "virtual:abth-story-pack")).toBe("export default null;");
  });

  test("copies no folder into the build", () => {
    expect(config.staticDirs).toBeUndefined();
  });
});
