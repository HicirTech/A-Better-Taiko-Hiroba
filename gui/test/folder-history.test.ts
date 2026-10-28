import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFolderHistoryStore } from "../electron/history-store";
import {
  MAX_FOLDER_HISTORY,
  mergeFolderHistory,
  readFolderHistory,
} from "../src/hiroba-session/folder-history";

const PLAYER = "000000000000";
const A = ["1001", "1008", "1014"];
const B = ["1001", "1008"];
const C = ["1020"];
const at = (minutes: number) => Date.UTC(2026, 9, 28, 3, minutes);
const kept = (songs: string[], minutes: number, setName: string | null = null) => ({
  songs,
  keptAt: at(minutes),
  setName,
});
const unnamed = (songs: string[]) => ({ songs, setName: null });

describe("mergeFolderHistory", () => {
  test("puts the folder saved first, then the one it replaced, both at the save's time", () => {
    expect(mergeFolderHistory([], kept(B, 1), unnamed(A))).toEqual([kept(B, 1), kept(A, 1)]);
  });

  test("moves a folder saved again to the front at its new time, and lists it once", () => {
    const history = [kept(B, 1), kept(A, 1)];

    expect(mergeFolderHistory(history, kept(A, 2), unnamed(B))).toEqual([kept(A, 2), kept(B, 1)]);
  });

  test("leaves a replaced folder it holds at its own time and place", () => {
    const history = [kept(C, 2), kept(A, 1)];

    expect(mergeFolderHistory(history, kept(B, 3), unnamed(A))).toEqual([
      kept(B, 3),
      kept(C, 2),
      kept(A, 1),
    ]);
  });

  test("keeps the same songs in another order as another folder", () => {
    const reordered = [...A].reverse();

    expect(mergeFolderHistory([], kept(reordered, 1), unnamed(A))).toEqual([
      kept(reordered, 1),
      kept(A, 1),
    ]);
  });

  test("keeps one entry when the save left the songs as they were", () => {
    expect(mergeFolderHistory([], kept(A, 1), unnamed(A))).toEqual([kept(A, 1)]);
  });

  test("keeps the names of the sets the two folders were", () => {
    expect(mergeFolderHistory([], kept(B, 1, "Party"), { songs: A, setName: "Practice" })).toEqual([
      kept(B, 1, "Party"),
      kept(A, 1, "Practice"),
    ]);
  });

  test("keeps a folder's name when it is saved again under none, and names a held one that had none", () => {
    const history = [kept(C, 2), kept(B, 1, "Party")];

    expect(mergeFolderHistory(history, kept(B, 3), { songs: C, setName: "Practice" })).toEqual([
      kept(B, 3, "Party"),
      kept(C, 2, "Practice"),
    ]);
  });

  test("drops the oldest past the cap", () => {
    const history = Array.from({ length: MAX_FOLDER_HISTORY }, (_, index) =>
      kept([String(2000 + index)], 0),
    );

    const merged = mergeFolderHistory(history, kept(B, 1), unnamed(A));

    expect(merged).toHaveLength(MAX_FOLDER_HISTORY);
    expect(merged.slice(0, 3).map(({ songs }) => songs)).toEqual([B, A, ["2000"]]);
  });
});

describe("readFolderHistory", () => {
  test("keeps the well-formed entries, each folder once, the first kept", () => {
    const stored = [
      kept(B, 2),
      { songs: ["10x"], keptAt: at(2), setName: null },
      { songs: A, keptAt: Number.NaN, setName: null },
      { songs: Array.from({ length: 31 }, () => "1001"), keptAt: at(2), setName: null },
      "a folder",
      kept(B, 1),
      kept(A, 1),
    ];

    expect(readFolderHistory(stored)).toEqual([kept(B, 2), kept(A, 1)]);
  });

  test("reads a missing or unfit set name as none", () => {
    const stored = [
      { songs: A, keptAt: at(1) },
      { songs: B, keptAt: at(1), setName: "  " },
      { songs: C, keptAt: at(1), setName: "x".repeat(41) },
    ];

    expect(readFolderHistory(stored)).toEqual([kept(A, 1), kept(B, 1), kept(C, 1)]);
  });

  test("reads anything but a list as no history", () => {
    expect(readFolderHistory(kept(A, 1))).toEqual([]);
  });
});

describe("createFolderHistoryStore on the disk", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  test("keeps a player's history across stores, and drops it when emptied", async () => {
    const folder = mkdtempSync(join(tmpdir(), "abth-folder-history-"));
    folders.push(folder);
    const path = join(folder, "folder-history.json");
    const history = [kept(B, 1, "Party")];

    await createFolderHistoryStore(path).save(PLAYER, history);
    expect(await createFolderHistoryStore(path).load(PLAYER)).toEqual(history);

    await createFolderHistoryStore(path).save(PLAYER, []);
    expect(await createFolderHistoryStore(path).load(PLAYER)).toEqual([]);
  });
});
