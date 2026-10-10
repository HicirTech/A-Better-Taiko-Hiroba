import { describe, expect, test } from "bun:test";
import { EMPTY_SCORE_BOOK, type Score, type ScoreBook } from "@abth/core";

import { createScoresStore, type ScoresFiles } from "../electron/scores-store";
import { readStoredScoreBook } from "../src/hiroba-session";
import { createIndexedDbScoresStore } from "../src/platform/android-scores-store";
import { createFakeIndexedDb } from "./indexeddb-fake";

const PLAYER = "000000000000";
const OTHER = "111111111111";

const listed: Score = {
  taikoNo: PLAYER,
  songNo: "1178",
  level: 4,
  crown: "gold",
  scoreRank: 6,
  fidelity: "list",
  record: null,
  fetchedAt: "2026-10-10T12:00:00.000Z",
};
const detailed: Score = {
  ...listed,
  level: 5,
  fidelity: "detail",
  record: {
    highScore: 950180,
    good: 900,
    ok: 12,
    bad: 0,
    drumroll: 30,
    maxCombo: 912,
    stageCount: 4,
    clearCount: 4,
    fullComboCount: 2,
    donderfulComboCount: 0,
    options: { speed: 1.5, doron: false, abekobe: false, random: "none", supportChart: null },
  },
};
const BOOK: ScoreBook = {
  songs: [{ songNo: "1178", title: "サンプル曲", genres: [1, 6] }],
  scores: { "1178/4": listed, "1178/5": detailed },
  stale: ["1178/5"],
  unlisted: [{ songTitle: "新曲", genre: 2, level: 4 }],
  full: false,
};

/** Files in memory, as the desktop store writes them. */
function fakeFiles() {
  const disk = new Map<string, string>();
  const files = {
    mkdirSync: () => undefined,
    readFileSync: (path: string) => {
      const text = disk.get(path);
      if (text === undefined) {
        throw new Error(`ENOENT ${path}`);
      }
      return text;
    },
    writeFileSync: (path: string, data: string) => {
      disk.set(path, data);
    },
    renameSync: (from: string, to: string) => {
      disk.set(to, disk.get(from) ?? "");
      disk.delete(from);
    },
  } as unknown as ScoresFiles;
  return { files, disk };
}

describe("readStoredScoreBook", () => {
  test("reads a kept book back whole", () => {
    expect(readStoredScoreBook(JSON.parse(JSON.stringify(BOOK)))).toEqual(BOOK);
  });

  test.each<[name: string, stored: unknown]>([
    ["nothing", undefined],
    ["another shape", { songs: [], scores: [] }],
    ["a book whose full read is not a yes or a no", { ...BOOK, full: "yes" }],
  ])("reads %s as a book never read", (_name, stored) => {
    expect(readStoredScoreBook(stored)).toEqual(EMPTY_SCORE_BOOK);
  });

  test("drops a chart whose record is broken, and the mark that named it", () => {
    const broken = { ...BOOK, scores: { ...BOOK.scores, "1178/5": { ...detailed, record: {} } } };
    const read = readStoredScoreBook(JSON.parse(JSON.stringify(broken)));
    expect(Object.keys(read.scores)).toEqual(["1178/4"]);
    expect(read.stale).toEqual([]);
  });
});

describe("the score stores", () => {
  test("the desktop's keeps each player's book in one file, across stores", async () => {
    const { files } = fakeFiles();
    await createScoresStore("scores.json", files).save(PLAYER, BOOK);
    await createScoresStore("scores.json", files).save(OTHER, EMPTY_SCORE_BOOK);

    const store = createScoresStore("scores.json", files);
    expect(await store.load(PLAYER)).toEqual(BOOK);
    expect(await store.load(OTHER)).toEqual(EMPTY_SCORE_BOOK);
  });

  test("Android's keeps each player's book in a database of its own", async () => {
    const indexedDb = createFakeIndexedDb();
    await createIndexedDbScoresStore(indexedDb.factory).save(PLAYER, BOOK);

    expect(await createIndexedDbScoresStore(indexedDb.factory).load(PLAYER)).toEqual(BOOK);
    expect(await createIndexedDbScoresStore(indexedDb.factory).load(OTHER)).toEqual(
      EMPTY_SCORE_BOOK,
    );
    expect([...indexedDb.tables.keys()]).toEqual(["books"]);
  });
});
