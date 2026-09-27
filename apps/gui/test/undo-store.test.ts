/** The desktop's undo slots on disk, in a folder of the system's temporary directory. */
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
const SLOT: UndoSlot<CostumeSet> = {
  record: {
    taikoNo: "000000000000",
    before: SET,
    after: { ...SET, colorFace: 3 },
    at: "2026-09-27T03:00:00.000Z",
    status: "current",
  },
  pending: null,
};

describe("createUndoStore", () => {
  test("reads an empty slot when nothing was kept", () => {
    expect(createUndoStore(storePath()).load("costume")).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps a slot across stores, as across launches, and leaves no temporary file", () => {
    const path = storePath();
    createUndoStore(path).save("costume", SLOT);
    expect(createUndoStore(path).load("costume")).toEqual(SLOT);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  test("reads a file it did not write, or one of another shape, as no slot", () => {
    const path = storePath();
    writeFileSync(path, "{not json");
    expect(createUndoStore(path).load("costume")).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(
      path,
      JSON.stringify({ version: 1, slots: { costume: { record: { taikoNo: 1 }, pending: null } } }),
    );
    expect(createUndoStore(path).load("costume")).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(path, JSON.stringify({ version: 2, slots: { costume: SLOT } }));
    expect(createUndoStore(path).load("costume")).toEqual(EMPTY_UNDO_SLOT);
  });

  test("throws when the slot cannot be written, so the write it guards is not sent", () => {
    // A file where the store's folder should be: nothing can be written under it.
    const inTheWay = storePath();
    writeFileSync(inTheWay, "");
    const store = createUndoStore(join(inTheWay, "undo.json"));
    expect(() => store.save("costume", SLOT)).toThrow();
  });
});
