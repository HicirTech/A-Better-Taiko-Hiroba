import { describe, expect, test } from "bun:test";

import { lazyDatabase } from "../src/platform/android-indexeddb";
import { keptRecords } from "../src/platform/kept-record";
import { createFakeIndexedDb } from "./indexeddb-fake";

const TABLE = "plays";
const PLAYER = "000000000000";
const OTHER = "111111111111";
const ASIDE = `${PLAYER}.unreadable`;

/** The records over a fake database, with its table made, as a first use makes it. */
async function setUp() {
  const indexedDb = createFakeIndexedDb();
  const database = lazyDatabase(indexedDb.factory, "abth-test", 1, (created) => {
    created.createObjectStore(TABLE);
  });
  const kept = keptRecords(database, TABLE, "plays", Array.isArray);
  await kept.load(PLAYER);
  const table = indexedDb.tables.get(TABLE) ?? new Map<string, unknown>();
  return { kept, table };
}

describe("keptRecords", () => {
  test("reads the data this version kept under a key, and none under another", async () => {
    const { kept } = await setUp();

    await kept.save(PLAYER, [1, 2]);

    expect(await kept.load(PLAYER)).toEqual([1, 2]);
    expect(await kept.load(OTHER)).toBeUndefined();
  });

  test.each<[name: string, record: unknown]>([
    ["no record at all", "not a record"],
    ["a record without a version", { plays: [1] }],
    ["a record of an older version", { v: 0, plays: [1] }],
    ["a record without its data", { v: 1 }],
    ["data that does not read", { v: 1, plays: "not a list" }],
  ])("keeps %s aside before writing over it", async (_name, record) => {
    const { kept, table } = await setUp();
    table.set(PLAYER, record);

    expect(await kept.load(PLAYER)).toBeUndefined();
    await kept.save(PLAYER, [3]);

    expect(table.get(ASIDE)).toEqual(record);
    expect(table.get(PLAYER)).toEqual({ v: 1, plays: [3] });
  });

  test("never writes over a record a later version kept", async () => {
    const { kept, table } = await setUp();
    const later = { v: 2, plays: { newer: true } };
    table.set(PLAYER, later);

    await kept.save(PLAYER, [3]);

    expect(table.get(PLAYER)).toEqual(later);
    expect(table.has(ASIDE)).toBe(false);
    expect(await kept.load(PLAYER)).toBeUndefined();
  });

  test("drops the data saved as none, and keeps the other keys'", async () => {
    const { kept, table } = await setUp();

    await kept.save(PLAYER, [1]);
    await kept.save(OTHER, [2]);
    await kept.save(PLAYER, undefined);

    expect(table.has(PLAYER)).toBe(false);
    expect(table.get(OTHER)).toEqual({ v: 1, plays: [2] });
    expect(table.has(ASIDE)).toBe(false);
  });
});
