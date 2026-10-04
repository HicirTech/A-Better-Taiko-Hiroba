import { describe, expect, test } from "bun:test";

import { PICTURE_EPOCH, type PictureKey } from "../src/hiroba-session";
import { createIndexedDbPictureStore } from "../src/platform/android-picture-store";
import { createFakeIndexedDb } from "./indexeddb-fake";

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

describe("createIndexedDbPictureStore", () => {
  test("gives back after a relaunch what it kept, and nothing for a key it did not", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbPictureStore(indexedDb.factory).put(item(36), bytes(4, 7));
    await createIndexedDbPictureStore(indexedDb.factory).put(plate(TAIKO_NO), bytes(3, 9));

    const relaunched = createIndexedDbPictureStore(indexedDb.factory);
    expect(await relaunched.get(item(36))).toEqual(bytes(4, 7));
    expect(await relaunched.get(plate(TAIKO_NO))).toEqual(bytes(3, 9));
    expect(await relaunched.get(item(4))).toBeNull();
  });

  test("keeps one player's pictures apart from another's, and apart from shared art", async () => {
    const store = createIndexedDbPictureStore(createFakeIndexedDb().factory);
    await store.put(plate("A"), bytes(2, 1));
    await store.put(plate("B"), bytes(2, 2));
    await store.put({ ...plate("A"), scope: "shared", player: null }, bytes(2, 3));
    expect(await store.get(plate("A"))).toEqual(bytes(2, 1));
    expect(await store.get(plate("B"))).toEqual(bytes(2, 2));
    expect(await store.get({ ...plate("A"), scope: "shared", player: null })).toEqual(bytes(2, 3));
  });

  test("keeps the bytes alone, under hashes, and no taiko number", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbPictureStore(indexedDb.factory);
    const body = bytes(16, 5);
    await store.put(item(36), body.subarray(4, 8));
    await store.put(plate(TAIKO_NO), bytes(4));
    const records = [...(indexedDb.tables.get("pictures") ?? [])];
    const hash = "[0-9a-f]{64}";
    expect(records.map(([key]) => key)).toEqual([
      expect.stringMatching(new RegExp(`^shared/${hash}$`)),
      expect.stringMatching(new RegExp(`^player/${hash}/${hash}$`)),
    ]);
    const [, kept] = records[0] ?? [];
    expect(kept).toEqual(bytes(4, 5));
    expect(kept instanceof Uint8Array && kept.buffer.byteLength).toBe(4);
    expect(JSON.stringify(records.map(([key]) => key))).not.toContain(TAIKO_NO);
  });

  test("clears what another epoch kept as it opens, and keeps its own", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbPictureStore(indexedDb.factory).put(item(36), bytes(4));
    expect(indexedDb.tables.get("meta")?.get("epoch")).toBe(PICTURE_EPOCH);

    const same = createIndexedDbPictureStore(indexedDb.factory);
    expect(await same.get(item(36))).toEqual(bytes(4));
    indexedDb.tables.get("meta")?.set("epoch", "v0");
    const bumped = createIndexedDbPictureStore(indexedDb.factory);
    expect(await bumped.get(item(36))).toBeNull();
    expect(indexedDb.tables.get("pictures")?.size).toBe(0);
    expect(indexedDb.tables.get("meta")?.get("epoch")).toBe(PICTURE_EPOCH);
  });

  test("keeps the run's pictures in memory when IndexedDB cannot be opened", async () => {
    const indexedDb = createFakeIndexedDb();
    indexedDb.faults.open = true;
    const store = createIndexedDbPictureStore(indexedDb.factory);
    await store.put(item(36), bytes(4, 7));
    expect(await store.get(item(36))).toEqual(bytes(4, 7));
    expect(indexedDb.tables.size).toBe(0);
  });

  test("a picture it cannot write is not kept, and nothing throws", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbPictureStore(indexedDb.factory);
    await store.get(item(4));
    indexedDb.faults.writes = true;
    await store.put(item(36), bytes(4));
    expect(await store.get(item(36))).toBeNull();
  });
});
