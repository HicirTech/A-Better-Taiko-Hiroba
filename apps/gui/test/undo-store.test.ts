/** The desktop's undo slots on disk, in a folder of the system's temporary directory. */
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CostumeSet, EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { createUndoStore } from "../electron/undo-store";
import {
  NAME_SLOT,
  nameRecordOf,
  OTHER,
  PLAYER,
  pendingOf,
  recordOf,
  SLOT,
  TITLE_SLOT,
  titleRecordOf,
} from "./undo-fixtures";

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

describe("createUndoStore", () => {
  test("reads an empty slot when nothing was kept", async () => {
    expect(await createUndoStore(storePath()).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps a slot across stores, as across launches, and leaves no temporary file", async () => {
    const path = storePath();
    await createUndoStore(path).save("costume", PLAYER, SLOT);
    expect(await createUndoStore(path).load("costume", PLAYER)).toEqual(SLOT);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  test("keeps each player's slot apart, and drops one left empty", async () => {
    const path = storePath();
    const store = createUndoStore(path);
    const theirs: UndoSlot<CostumeSet> = { record: null, pending: pendingOf(OTHER) };
    await store.save("costume", PLAYER, SLOT);
    await store.save("costume", OTHER, theirs);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("costume", OTHER)).toEqual(theirs);

    await store.save("costume", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await store.load("costume", OTHER)).toEqual(theirs);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      version: 2,
      slots: { costume: { [OTHER]: theirs } },
    });
  });

  test("keeps the costume's slot and the title's apart, for one player and for two", async () => {
    const path = storePath();
    const store = createUndoStore(path);
    const theirs = { record: titleRecordOf(OTHER), pending: null };
    await store.save("costume", PLAYER, SLOT);
    await store.save("title", PLAYER, TITLE_SLOT);
    await store.save("title", OTHER, theirs);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(TITLE_SLOT);
    expect(await store.load("title", OTHER)).toEqual(theirs);
    expect(await store.load("costume", OTHER)).toEqual(EMPTY_UNDO_SLOT);

    await store.save("title", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(Object.keys(JSON.parse(readFileSync(path, "utf8")).slots.title)).toEqual([OTHER]);
  });

  test("reads a file that holds only the costume as it did, and a title in it as none", async () => {
    const path = storePath();
    writeFileSync(path, JSON.stringify({ version: 2, slots: { costume: { [PLAYER]: SLOT } } }));
    const store = createUndoStore(path);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("keeps the name's slot apart from the other two, for one player and for two", async () => {
    const path = storePath();
    const store = createUndoStore(path);
    const theirs = { record: nameRecordOf(OTHER), pending: null };
    await store.save("costume", PLAYER, SLOT);
    await store.save("title", PLAYER, TITLE_SLOT);
    await store.save("name", PLAYER, NAME_SLOT);
    await store.save("name", OTHER, theirs);
    expect(await store.load("name", PLAYER)).toEqual(NAME_SLOT);
    expect(await store.load("name", OTHER)).toEqual(theirs);
    expect(await store.load("title", OTHER)).toEqual(EMPTY_UNDO_SLOT);

    await store.save("name", PLAYER, EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("title", PLAYER)).toEqual(TITLE_SLOT);
    expect(Object.keys(JSON.parse(readFileSync(path, "utf8")).slots.name)).toEqual([OTHER]);
  });

  test("reads a file that holds no name as it did, and a name in it as none", async () => {
    const path = storePath();
    const kept = { costume: { [PLAYER]: SLOT }, title: { [PLAYER]: TITLE_SLOT } };
    writeFileSync(path, JSON.stringify({ version: 2, slots: kept }));
    const store = createUndoStore(path);
    expect(await store.load("title", PLAYER)).toEqual(TITLE_SLOT);
    expect(await store.load("name", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("reads a slot filed under a kind that is not its set's as none", async () => {
    const path = storePath();
    const misfiled = {
      title: { [PLAYER]: SLOT },
      costume: { [PLAYER]: TITLE_SLOT },
      name: { [PLAYER]: TITLE_SLOT },
    };
    writeFileSync(path, JSON.stringify({ version: 2, slots: misfiled }));
    const store = createUndoStore(path);
    expect(await store.load("title", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await store.load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    expect(await store.load("name", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("files a first-version slot under each player it names", async () => {
    const path = storePath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        slots: { costume: { record: recordOf(PLAYER), pending: pendingOf(OTHER) } },
      }),
    );
    const store = createUndoStore(path);
    expect(await store.load("costume", PLAYER)).toEqual(SLOT);
    expect(await store.load("costume", OTHER)).toEqual({ record: null, pending: pendingOf(OTHER) });
  });

  test("reads a file it did not write, or one of another shape, as no slot", async () => {
    const path = storePath();
    writeFileSync(path, "{not json");
    expect(await createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(
      path,
      JSON.stringify({
        version: 2,
        slots: { costume: { [PLAYER]: { record: { taikoNo: 1 }, pending: null } } },
      }),
    );
    expect(await createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
    // A slot filed under one player that holds another's is no one's.
    writeFileSync(path, JSON.stringify({ version: 2, slots: { costume: { [OTHER]: SLOT } } }));
    expect(await createUndoStore(path).load("costume", OTHER)).toEqual(EMPTY_UNDO_SLOT);
    writeFileSync(path, JSON.stringify({ version: 3, slots: { costume: { [PLAYER]: SLOT } } }));
    expect(await createUndoStore(path).load("costume", PLAYER)).toEqual(EMPTY_UNDO_SLOT);
  });

  test("rejects when the slot cannot be written, so the write it guards is not sent", async () => {
    // A file where the store's folder should be: nothing can be written under it.
    const inTheWay = storePath();
    writeFileSync(inTheWay, "");
    const store = createUndoStore(join(inTheWay, "undo.json"));
    await expect(store.save("costume", PLAYER, SLOT)).rejects.toThrow();
  });
});
