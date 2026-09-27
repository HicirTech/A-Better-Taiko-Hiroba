/** The desktop's undo slots on disk, in a folder of the system's temporary directory. */
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CostumeSet, EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { createUndoStore } from "../electron/undo-store";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function storePath(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-undo-"));
  folders.push(folder);
  return join(folder, "undo.json");
}

const PLAYER = "000000000000";
const OTHER = "111111111111";
const SET: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};
const recordOf = (taikoNo: string) => ({
  taikoNo,
  before: SET,
  after: { ...SET, colorFace: 3 },
  at: "2026-09-27T03:00:00.000Z",
  status: "current" as const,
});
const pendingOf = (taikoNo: string) => ({
  taikoNo,
  before: SET,
  expectedAfter: { ...SET, colorFace: 9 },
  at: "2026-09-27T03:00:00.000Z",
  purpose: "change" as const,
});
const SLOT: UndoSlot<CostumeSet> = { record: recordOf(PLAYER), pending: null };

describe("createUndoStore", () => {
  test("reads an empty slot when nothing was kept", () => {
    expect(createUndoStore(storePath()).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps a slot across stores, as across launches, and leaves no temporary file", () => {
    const path = storePath();
    createUndoStore(path).save("costume", PLAYER, SLOT);
    expect(createUndoStore(path).load("costume", PLAYER)).toEqual(SLOT);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  test("keeps each player's slot apart, and drops one left empty", () => {
    const path = storePath();
    const store = createUndoStore(path);
    const theirs: UndoSlot<CostumeSet> = { record: null, pending: pendingOf(OTHER) };
    store.save("costume", PLAYER, SLOT);
    store.save("costume", OTHER, theirs);
    expect(store.load("costume", PLAYER)).toEqual(SLOT);
    expect(store.load("costume", OTHER)).toEqual(theirs);

    store.save("costume", PLAYER, EMPTY_UNDO_SLOT);
    expect(store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(store.load("costume", OTHER)).toEqual(theirs);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      version: 2,
      slots: { costume: { [OTHER]: theirs } },
    });
  });

  test("files a first-version slot under each player it names", () => {
    const path = storePath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        slots: { costume: { record: recordOf(PLAYER), pending: pendingOf(OTHER) } },
      }),
    );
    const store = createUndoStore(path);
    expect(store.load("costume", PLAYER)).toEqual(SLOT);
    expect(store.load("costume", OTHER)).toEqual({ record: null, pending: pendingOf(OTHER) });
  });

  test("reads a file it did not write, or one of another shape, as no slot", () => {
    const path = storePath();
    writeFileSync(path, "{not json");
    expect(createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(
      path,
      JSON.stringify({
        version: 2,
        slots: { costume: { [PLAYER]: { record: { taikoNo: 1 }, pending: null } } },
      }),
    );
    expect(createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    // A slot filed under one player that holds another's is no one's.
    writeFileSync(path, JSON.stringify({ version: 2, slots: { costume: { [OTHER]: SLOT } } }));
    expect(createUndoStore(path).load("costume", OTHER)).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(path, JSON.stringify({ version: 3, slots: { costume: { [PLAYER]: SLOT } } }));
    expect(createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("throws when the slot cannot be written, so the write it guards is not sent", () => {
    // A file where the store's folder should be: nothing can be written under it.
    const inTheWay = storePath();
    writeFileSync(inTheWay, "");
    const store = createUndoStore(join(inTheWay, "undo.json"));
    expect(() => store.save("costume", PLAYER, SLOT)).toThrow();
  });
});
