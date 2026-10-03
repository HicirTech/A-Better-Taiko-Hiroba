import { describe, expect, test } from "bun:test";
import { type CostumeSet, EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { createIndexedDbUndoStore } from "../src/platform/android-undo-store";
import { createFakeIndexedDb } from "./indexeddb-fake";
import { NAME_SLOT, OTHER, PLAYER, pendingOf, SLOT, TITLE_SLOT } from "./undo-fixtures";

const KEY = `costume/${PLAYER}`;

describe("createIndexedDbUndoStore", () => {
  test("reads an empty slot when nothing was kept", async () => {
    const store = createIndexedDbUndoStore(createFakeIndexedDb().factory);
    expect(await store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps a slot across stores, as across launches", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbUndoStore(indexedDb.factory).save("costume", PLAYER, SLOT);
    expect(await createIndexedDbUndoStore(indexedDb.factory).load("costume", PLAYER)).toEqual(SLOT);
  });

  test("keeps each player's slot apart, and drops one left empty", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    const theirs: UndoSlot<CostumeSet> = { record: null, pending: pendingOf(OTHER) };
    await store.save("costume", PLAYER, SLOT);
    await store.save("costume", OTHER, theirs);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("costume", OTHER)).toEqual(theirs);

    await store.save("costume", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await store.load("costume", OTHER)).toEqual(theirs);
    expect([...(indexedDb.tables.get("slots") ?? []).keys()]).toEqual([`costume/${OTHER}`]);

    await store.save("costume", OTHER, EMPTY_UNDO_SLOT);
    expect(indexedDb.tables.get("slots")?.size).toBe(0);
  });

  test("keeps the costume's slot and the title's apart, each under its kind and player", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    await store.save("costume", PLAYER, SLOT);
    await store.save("title", PLAYER, TITLE_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(TITLE_SLOT);
    expect([...(indexedDb.tables.get("slots") ?? []).keys()].sort()).toEqual([
      `costume/${PLAYER}`,
      `title/${PLAYER}`,
    ]);

    await store.save("title", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps the name's slot apart from the other two, each under its kind and player", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    await store.save("costume", PLAYER, SLOT);
    await store.save("title", PLAYER, TITLE_SLOT);
    await store.save("name", PLAYER, NAME_SLOT);
    expect(await store.load("name", PLAYER)).toEqual(NAME_SLOT);
    expect(await store.load("name", OTHER)).toEqual(EMPTY_UNDO_SLOT);
    expect([...(indexedDb.tables.get("slots") ?? []).keys()].sort()).toEqual([
      `costume/${PLAYER}`,
      `name/${PLAYER}`,
      `title/${PLAYER}`,
    ]);

    await store.save("name", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(TITLE_SLOT);
    expect(await store.load("name", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("reads a slot kept under one kind as none under another whose sets it does not hold", async () => {
    const indexedDb = createFakeIndexedDb();
    indexedDb.tables.set(
      "slots",
      new Map([
        [`title/${PLAYER}`, { v: 1, slot: SLOT }],
        [`name/${PLAYER}`, { v: 1, slot: TITLE_SLOT }],
      ]),
    );
    const store = createIndexedDbUndoStore(indexedDb.factory);
    expect(await store.load("title", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await store.load("name", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("writes each slot in a transaction on the slots alone, asked to be durable", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    await store.save("costume", PLAYER, SLOT);
    await store.load("costume", PLAYER);
    await store.save("costume", PLAYER, EMPTY_UNDO_SLOT);
    expect(indexedDb.transactions).toEqual([
      { names: ["slots"], mode: "readwrite", durability: "strict" },
      { names: ["slots"], mode: "readonly", durability: undefined },
      { names: ["slots"], mode: "readwrite", durability: "strict" },
    ]);
  });

  test("keeps the sets and whose they are, in a database of its own", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbUndoStore(indexedDb.factory).save("costume", PLAYER, SLOT);
    expect([...indexedDb.tables.keys()]).toEqual(["slots"]);
    expect(indexedDb.tables.get("slots")?.get(KEY)).toEqual({ v: 1, slot: SLOT });
  });

  test("rejects a save the storage refuses, and keeps what it held", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    await store.save("costume", PLAYER, SLOT);
    indexedDb.faults.writes = true;
    const next: UndoSlot<CostumeSet> = { record: null, pending: pendingOf(PLAYER) };
    await expect(store.save("costume", PLAYER, next)).rejects.toThrow();
    await expect(store.save("costume", PLAYER, EMPTY_UNDO_SLOT)).rejects.toThrow();

    indexedDb.faults.writes = false;
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
  });

  test("fails every call while the database will not open, keeps nothing in memory, and recovers", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    indexedDb.faults.open = true;
    await expect(store.save("costume", PLAYER, SLOT)).rejects.toThrow();
    await expect(store.load("costume", PLAYER)).rejects.toThrow();

    indexedDb.faults.open = false;
    expect(await store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    await store.save("costume", PLAYER, SLOT);
    expect(await createIndexedDbUndoStore(indexedDb.factory).load("costume", PLAYER)).toEqual(SLOT);
  });

  test("reads a value it did not write, or one of another shape or player, as no slot", async () => {
    const indexedDb = createFakeIndexedDb();
    const store = createIndexedDbUndoStore(indexedDb.factory);
    await store.load("costume", PLAYER);
    const slots = indexedDb.tables.get("slots");
    const readAfterKeeping = async (value: unknown, taikoNo = PLAYER) => {
      slots?.set(`costume/${taikoNo}`, value);
      return store.load("costume", taikoNo);
    };

    expect(await readAfterKeeping("not a record")).toEqual(EMPTY_UNDO_SLOT);
    expect(await readAfterKeeping(null)).toEqual(EMPTY_UNDO_SLOT);
    expect(await readAfterKeeping({ v: 1 })).toEqual(EMPTY_UNDO_SLOT);
    expect(await readAfterKeeping({ v: 2, slot: SLOT })).toEqual(EMPTY_UNDO_SLOT);
    expect(
      await readAfterKeeping({ v: 1, slot: { record: { taikoNo: 1 }, pending: null } }),
    ).toEqual(EMPTY_UNDO_SLOT);
    expect(await readAfterKeeping({ v: 1, slot: SLOT }, OTHER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await readAfterKeeping({ v: 1, slot: SLOT })).toEqual(SLOT);
  });
});
