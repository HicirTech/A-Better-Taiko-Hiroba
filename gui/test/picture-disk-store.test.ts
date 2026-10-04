import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import { createDiskPictureStore } from "../electron/picture-disk-store";
import { PICTURE_EPOCH, type PictureKey } from "../src/hiroba-session";

const TAIKO_NO = "000000000000";
const item = (id: number): PictureKey => ({
  scope: "shared",
  player: null,
  name: `${PICTURE_EPOCH}/item/1/${id}`,
});
const plate = (player: string): PictureKey => ({
  scope: "player",
  player,
  name: `${PICTURE_EPOCH}/titleplate/bare/%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB`,
});
const bytes = (size: number, fill = 1) => new Uint8Array(size).fill(fill);

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function picturesFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-pictures-"));
  folders.push(folder);
  return join(folder, "pictures");
}

function filesIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

describe("createDiskPictureStore", () => {
  test("gives back after a relaunch what it kept, and nothing for a key it did not", async () => {
    const folder = picturesFolder();
    await createDiskPictureStore(folder).put(item(36), bytes(4, 7));
    await createDiskPictureStore(folder).put(plate(TAIKO_NO), bytes(3, 9));

    const relaunched = createDiskPictureStore(folder);
    expect(await relaunched.get(item(36))).toEqual(bytes(4, 7));
    expect(await relaunched.get(plate(TAIKO_NO))).toEqual(bytes(3, 9));
    expect(await relaunched.get(item(4))).toBeNull();
  });

  test("keeps one player's pictures apart from another's, and apart from shared art", async () => {
    const store = createDiskPictureStore(picturesFolder());
    await store.put(plate("A"), bytes(2, 1));
    await store.put(plate("B"), bytes(2, 2));
    await store.put({ ...plate("A"), scope: "shared", player: null }, bytes(2, 3));
    expect(await store.get(plate("A"))).toEqual(bytes(2, 1));
    expect(await store.get(plate("B"))).toEqual(bytes(2, 2));
    expect(await store.get({ ...plate("A"), scope: "shared", player: null })).toEqual(bytes(2, 3));
  });

  test("names its files by hashes alone, under the epoch, and leaves no temporary file", async () => {
    const folder = picturesFolder();
    const store = createDiskPictureStore(folder);
    await store.put(item(36), bytes(4));
    await store.put(plate(TAIKO_NO), bytes(4));
    const files = filesIn(folder);
    expect(files).toHaveLength(2);
    const hash = "[0-9a-f]{64}";
    expect(files).toContainEqual(expect.stringMatching(new RegExp(`^v1/shared/${hash}\\.png$`)));
    expect(files).toContainEqual(
      expect.stringMatching(new RegExp(`^v1/player/${hash}/${hash}\\.png$`)),
    );
    expect(files.join("\n")).not.toContain(TAIKO_NO);
  });

  test("replaces a picture kept under the same key", async () => {
    const store = createDiskPictureStore(picturesFolder());
    await store.put(item(36), bytes(4, 1));
    await store.put(item(36), bytes(6, 2));
    expect(await store.get(item(36))).toEqual(bytes(6, 2));
  });

  test("drops what another epoch kept as it opens, and keeps its own", async () => {
    const folder = picturesFolder();
    await createDiskPictureStore(folder).put(item(36), bytes(4));
    mkdirSync(join(folder, "v0", "shared"), { recursive: true });
    writeFileSync(join(folder, "v0", "shared", "old.png"), bytes(4));

    const relaunched = createDiskPictureStore(folder);
    expect(existsSync(join(folder, "v0"))).toBe(false);
    expect(await relaunched.get(item(36))).toEqual(bytes(4));
  });

  test("a picture it cannot write is not kept, and nothing throws", async () => {
    const folder = picturesFolder();
    const store = createDiskPictureStore(folder);
    // A file where the epoch's folder should be: nothing can be written under it.
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, PICTURE_EPOCH), "not a folder");
    await store.put(item(36), bytes(4));
    expect(await store.get(item(36))).toBeNull();
  });
});
