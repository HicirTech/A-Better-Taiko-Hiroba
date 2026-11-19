import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { keptProfileFile } from "../electron/kept-profile-file";
import {
  KEPT_PROFILE_VERSION,
  type KeptProfile,
  keptProfileIn,
  keptProfileOf,
  type PictureSources,
} from "../src/hiroba-session";
import { capacitorStores } from "../src/platform/capacitor-stores";
import type { ProfileView } from "../src/shared/session-port";
import { memoryStorage, refusing } from "./storage-fakes";

const TAIKO_NO = "000000000000";
/** The どんメダル plate's id, a placeholder in the form my page writes: 48 hex digits. */
const MEDAL_PLATE_ID = "0123456789abcdef0123456789abcdef0123456789abcdef";
const MEDAL_NAME = "どんメダル2026秋";
const LABEL = { src: "data:image/png;base64,iVBORw0KGgo=", width: 96, height: 40 };
const VIEW: ProfileView = {
  nickname: "サンプルどん",
  title: "サンプルの称号",
  rename: "open",
  region: "サンプル",
  dan: { board: 15, picture: LABEL },
  crowns: { silver: 11, gold: 2, donderful: 1 },
  panel: { countLevel: 5, ranks: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 } },
  medal: { name: MEDAL_NAME, progress: { kind: "collecting", count: 3 } },
  favoriteSong: null,
  favoriteFolder: ["サンプル曲A"],
  fetchedAt: "2026-09-27T00:00:00.000Z",
};
const SOURCES: PictureSources = {
  titlePlate: { form: "bare", title: "サンプルの称号" },
  scorePanel: { level: 5 },
  medalPlate: { id: MEDAL_PLATE_ID, progress: "collecting" },
  myDon: { v: "1.2" },
};
const KEPT = keptProfileOf({ taikoNo: TAIKO_NO, view: VIEW, pictures: SOURCES });

/** The kept read as a store writes it out and reads it back in. */
const written = (kept: KeptProfile = KEPT): Record<string, unknown> =>
  JSON.parse(JSON.stringify({ v: KEPT_PROFILE_VERSION, ...kept }));

/** The written read with the part at `path` set to `value`. */
function writtenWith(path: readonly string[], value: unknown): Record<string, unknown> {
  const record = written();
  const parent = path
    .slice(0, -1)
    .reduce<Record<string, unknown>>((at, step) => at[step] as Record<string, unknown>, record);
  parent[path.at(-1) ?? ""] = value;
  return record;
}

describe("keptProfileOf", () => {
  test("keeps nothing of the どんメダル: no name, no count, no plate id", () => {
    const text = JSON.stringify(written());

    expect(text).not.toContain(MEDAL_PLATE_ID);
    expect(text).not.toContain(MEDAL_NAME);
    expect(text).not.toContain("medal");
  });
});

describe("keptProfileIn", () => {
  test("reads back what a good read keeps", () => {
    expect(keptProfileIn(written())).toEqual(KEPT);
  });

  test("reads back a read with no dan or region and with no picture shown", () => {
    const plain = keptProfileOf({
      taikoNo: TAIKO_NO,
      view: { ...VIEW, dan: null, region: null },
      pictures: { ...SOURCES, titlePlate: "notShown", myDon: "unexpectedSrc" },
    });

    expect(keptProfileIn(written(plain))).toEqual(plain);
  });

  test("reads back a dan that did not read, with its code", () => {
    const unread = keptProfileOf({
      taikoNo: TAIKO_NO,
      view: { ...VIEW, dan: { unreadable: true, code: "dan=unnamed", picture: null } },
      pictures: SOURCES,
    });

    expect(keptProfileIn(written(unread))).toEqual(unread);
  });

  type Broken = [what: string, path: readonly string[], value: unknown];
  test.each<Broken>([
    ["a taiko number of eleven digits", ["taikoNo"], "00000000000"],
    ["a nickname that is no text", ["view", "nickname"], 1],
    ["a rename state it does not know", ["view", "rename"], "soon"],
    ["a crown count that is no whole number", ["view", "crowns", "gold"], 1.5],
    ["a rank's count missing", ["view", "panel", "ranks", "8"], undefined],
    ["a folder title that is no text", ["view", "favoriteFolder"], [1]],
    ["a read time that is no time", ["view", "fetchedAt"], "yesterday"],
    ["a dan board past 達人", ["view", "dan", "board"], 20],
    ["a dan label that is no PNG", ["view", "dan", "picture", "src"], "https://example.test/a.png"],
    ["a title plate of a form it does not know", ["pictures", "titlePlate", "form"], "byName"],
    ["a score panel past its art", ["pictures", "scorePanel", "level"], 100],
    ["a My Don version that adds to its address", ["pictures", "myDon", "v"], "1&fn=mydon_1"],
    ["a reason for no picture it does not know", ["pictures", "myDon"], "notKept"],
    ["no picture sources", ["pictures"], undefined],
  ])("reads a kept read with %s as none", (_what, path, value) => {
    expect(keptProfileIn(writtenWith(path, value))).toBeNull();
  });
});

describe("the desktop's kept read", () => {
  const folder = mkdtempSync(join(tmpdir(), "abth-kept-profile-"));
  afterAll(() => rmSync(folder, { recursive: true, force: true }));
  const path = join(folder, "kept-profile.json");

  test("is kept in its file, given back, and deleted for null", async () => {
    const store = keptProfileFile(path);
    await store.save(KEPT);

    expect(await store.load()).toEqual(KEPT);
    await store.save(null);
    expect(existsSync(path)).toBe(false);
    expect(await store.load()).toBeNull();
  });

  test("reads a broken file, or one of another shape, as none", async () => {
    writeFileSync(path, "{");
    expect(await keptProfileFile(path).load()).toBeNull();

    writeFileSync(path, JSON.stringify({ ...written(), v: KEPT_PROFILE_VERSION + 1 }));
    expect(await keptProfileFile(path).load()).toBeNull();
  });

  test("throws nothing where its file cannot be written", async () => {
    writeFileSync(path, "{}");

    expect(await keptProfileFile(join(path, "inside.json")).save(KEPT)).toBeUndefined();
  });
});

describe("Android's kept read", () => {
  test("is kept in the page's storage under abth.keptProfile, given back, and deleted", async () => {
    const storage = memoryStorage();
    const { profile } = capacitorStores(undefined, storage);
    await profile.save(KEPT);

    expect(JSON.parse(storage.getItem("abth.keptProfile") ?? "null")).toEqual(written());
    expect(await profile.load()).toEqual(KEPT);
    await profile.save(null);
    expect(storage.getItem("abth.keptProfile")).toBeNull();
  });

  test("is none, and throws nothing, where the page's storage refuses", async () => {
    const { profile } = capacitorStores(undefined, refusing);
    await profile.save(KEPT);

    expect(await profile.load()).toBeNull();
  });
});
