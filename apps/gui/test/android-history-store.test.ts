import { describe, expect, test } from "bun:test";

import { MAX_COSTUME_HISTORY } from "../src/hiroba-session/costume-history";
import { createIndexedDbHistoryStore } from "../src/platform/android-history-store";
import { entryOf, pictureOf, SET } from "./history-fixtures";
import { createFakeIndexedDb } from "./indexeddb-fake";

const PLAYER = "000000000000";
const OTHER = "111111111111";
const KEPT = [entryOf(1, pictureOf("one")), entryOf(2)];

describe("createIndexedDbHistoryStore", () => {
  test("reads an empty history when nothing was kept", async () => {
    const store = createIndexedDbHistoryStore(createFakeIndexedDb().factory);

    expect(await store.load(PLAYER)).toEqual([]);
  });

  test("keeps a history across stores, as across launches", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbHistoryStore(indexedDb.factory).save(PLAYER, KEPT);

    expect(await createIndexedDbHistoryStore(indexedDb.factory).load(PLAYER)).toEqual(KEPT);
  });

  test("keeps each player's history apart, and drops one left empty", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);
    const theirs = [entryOf(7, pictureOf("seven"))];
    await store.save(PLAYER, KEPT);
    await store.save(OTHER, theirs);

    expect(await store.load(PLAYER)).toEqual(KEPT);
    expect(await store.load(OTHER)).toEqual(theirs);

    await store.save(PLAYER, []);

    expect(await store.load(PLAYER)).toEqual([]);
    expect(await store.load(OTHER)).toEqual(theirs);
    expect([...(indexedDb.tables.get("histories") ?? []).keys()]).toEqual([OTHER]);
  });

  test("keeps the sets and their pictures, in a database of its own", async () => {
    const indexedDb = createFakeIndexedDb();

    await createIndexedDbHistoryStore(indexedDb.factory).save(PLAYER, KEPT);

    expect([...indexedDb.tables.keys()]).toEqual(["histories"]);
    expect(indexedDb.tables.get("histories")?.get(PLAYER)).toEqual({ v: 1, entries: KEPT });
  });

  test("writes each history in a transaction on the histories alone", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);

    await store.save(PLAYER, KEPT);
    await store.load(PLAYER);

    expect(indexedDb.transactions).toEqual([
      { names: ["histories"], mode: "readwrite", durability: undefined },
      { names: ["histories"], mode: "readonly", durability: undefined },
    ]);
  });

  test("rejects a save the storage refuses, and keeps what it held", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);
    await store.save(PLAYER, KEPT);
    indexedDb.faults.writes = true;

    await expect(store.save(PLAYER, [entryOf(9)])).rejects.toThrow();
    await expect(store.save(PLAYER, [])).rejects.toThrow();

    indexedDb.faults.writes = false;
    expect(await store.load(PLAYER)).toEqual(KEPT);
  });

  test("fails every call while the database will not open, and recovers", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);
    indexedDb.faults.open = true;

    await expect(store.save(PLAYER, KEPT)).rejects.toThrow();
    await expect(store.load(PLAYER)).rejects.toThrow();

    indexedDb.faults.open = false;
    expect(await store.load(PLAYER)).toEqual([]);
    await store.save(PLAYER, KEPT);
    expect(await createIndexedDbHistoryStore(indexedDb.factory).load(PLAYER)).toEqual(KEPT);
  });

  test("reads a value it did not write, or one of another shape, as no history", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);
    await store.load(PLAYER);
    const histories = indexedDb.tables.get("histories");
    const readAfterKeeping = async (value: unknown) => {
      histories?.set(PLAYER, value);
      return store.load(PLAYER);
    };

    expect(await readAfterKeeping("not a record")).toEqual([]);
    expect(await readAfterKeeping(null)).toEqual([]);
    expect(await readAfterKeeping({ v: 1 })).toEqual([]);
    expect(await readAfterKeeping({ v: 2, entries: KEPT })).toEqual([]);
    expect(await readAfterKeeping({ v: 1, entries: "not a list" })).toEqual([]);
    expect(
      await readAfterKeeping({ v: 1, entries: [{ set: SET, picture: "https://x.test/a.png" }] }),
    ).toEqual([]);
    expect(await readAfterKeeping({ v: 1, entries: KEPT })).toEqual(KEPT);
  });

  test("gives back the well-formed entries only, each set once and at most the cap", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbHistoryStore(indexedDb.factory);
    await store.load(PLAYER);
    const crowd = Array.from({ length: MAX_COSTUME_HISTORY + 5 }, (_, at) => entryOf(at + 1));
    const stored = [{ set: SET, picture: 7 }, entryOf(1), entryOf(1), ...crowd];
    indexedDb.tables.get("histories")?.set(PLAYER, { v: 1, entries: stored });

    expect(await store.load(PLAYER)).toEqual(crowd.slice(0, MAX_COSTUME_HISTORY));
  });
});
