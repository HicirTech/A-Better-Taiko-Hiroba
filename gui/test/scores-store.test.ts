import { describe, expect, test } from "bun:test";
import {
  EMPTY_SCORE_BOOK,
  MAX_SCORE_CHANGES,
  type Score,
  type ScoreBook,
  type ScoreChange,
  type ScoreChangeLog,
} from "@abth/core";
import type { StoreFiles } from "../electron/replace-file";
import { createScoreChangesStore } from "../electron/score-changes-store";
import { createScoresStore } from "../electron/scores-store";
import {
  createMemoryScoreChangesStore,
  readStoredScoreBook,
  readStoredScoreChanges,
} from "../src/hiroba-session";
import { createIndexedDbScoreChangesStore } from "../src/platform/android-score-changes-store";
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
  ranking: null,
  sections: [],
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
  ranking: 5503,
  sections: [{ crown: "gold", score: 139020, good: 100, ok: 6, bad: 0, drumroll: 0 }],
};
const BOOK: ScoreBook = {
  songs: [{ songNo: "1178", title: "サンプル曲", genres: [1, 6] }],
  scores: { "1178/4": listed, "1178/5": detailed },
  stale: ["1178/5"],
  unlisted: [{ songTitle: "新曲", genre: 2, level: 4 }],
  full: false,
};

/** 1178's Ura, first cleared, then played again for a better score. */
const CHANGES: readonly ScoreChange[] = [
  {
    songNo: "1178",
    level: 5,
    from: {
      crown: "none",
      scoreRank: null,
      highScore: null,
      stageCount: null,
      clearCount: null,
      fullComboCount: null,
      donderfulComboCount: null,
      fetchedAt: "2026-10-09T12:00:00.000Z",
    },
    to: {
      crown: "silver",
      scoreRank: 5,
      highScore: 940000,
      stageCount: 3,
      clearCount: 3,
      fullComboCount: 0,
      donderfulComboCount: 0,
      fetchedAt: "2026-10-10T12:00:00.000Z",
    },
  },
  {
    songNo: "1178",
    level: 5,
    from: {
      crown: "silver",
      scoreRank: 5,
      highScore: 940000,
      stageCount: 3,
      clearCount: 3,
      fullComboCount: 0,
      donderfulComboCount: 0,
      fetchedAt: "2026-10-10T12:00:00.000Z",
    },
    to: {
      crown: "gold",
      scoreRank: 6,
      highScore: 950180,
      stageCount: 4,
      clearCount: 4,
      fullComboCount: 2,
      donderfulComboCount: 0,
      fetchedAt: "2026-10-11T12:00:00.000Z",
    },
  },
];
const LOG: ScoreChangeLog = { baselined: true, changes: CHANGES };

/** Files in memory, as the desktop store writes them. */
function fakeFiles() {
  const disk = new Map<string, string>();
  const files = {
    mkdirSync: () => undefined,
    readFileSync: (path: string) => {
      const text = disk.get(path);
      if (text === undefined) {
        throw Object.assign(new Error(`ENOENT ${path}`), { code: "ENOENT" });
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
  } as unknown as StoreFiles;
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

  test("reads a chart kept before its ranking and sections were read as having none", () => {
    const { ranking: _ranking, sections: _sections, ...older } = detailed;
    const kept = { ...BOOK, scores: { "1178/5": older } };
    const read = readStoredScoreBook(JSON.parse(JSON.stringify(kept)));
    expect(read.scores["1178/5"]?.ranking).toBeNull();
    expect(read.scores["1178/5"]?.sections).toEqual([]);
  });

  test("drops a chart whose record is broken, and the mark that named it", () => {
    const broken = { ...BOOK, scores: { ...BOOK.scores, "1178/5": { ...detailed, record: {} } } };
    const read = readStoredScoreBook(JSON.parse(JSON.stringify(broken)));
    expect(Object.keys(read.scores)).toEqual(["1178/4"]);
    expect(read.stale).toEqual([]);
  });
});

describe("readStoredScoreChanges", () => {
  test("reads a kept log back whole", () => {
    expect(readStoredScoreChanges(JSON.parse(JSON.stringify(LOG)))).toEqual(LOG);
  });

  test.each<[name: string, stored: unknown]>([
    ["nothing", undefined],
    ["another shape", { changes: {} }],
    ["a log whose start is not a yes or a no", { ...LOG, baselined: "yes" }],
  ])("reads %s as no log", (_name, stored) => {
    expect(readStoredScoreChanges(stored)).toBeNull();
  });

  test("drops a row with a broken reading, and keeps the others", () => {
    const broken = { ...CHANGES[1], to: { ...CHANGES[1]?.to, stageCount: -1 } };
    const read = readStoredScoreChanges({ baselined: true, changes: [CHANGES[0], broken] });
    expect(read?.changes).toEqual(CHANGES.slice(0, 1));
  });

  test("keeps no more rows than the cap from what is kept", () => {
    const gold = CHANGES[1]?.to;
    const replayed = { songNo: "1178", level: 5, from: gold, to: { ...gold, stageCount: 5 } };
    const changes = Array.from({ length: MAX_SCORE_CHANGES + 2 }, () => replayed);
    expect(readStoredScoreChanges({ baselined: true, changes })?.changes).toHaveLength(
      MAX_SCORE_CHANGES,
    );
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

  test("the logs of changes: none until saved, then each player's own, on every platform", async () => {
    const { files } = fakeFiles();
    const indexedDb = createFakeIndexedDb();
    const stores = [
      () => createMemoryScoreChangesStore(),
      () => createScoreChangesStore("score-changes.json", files),
      () => createIndexedDbScoreChangesStore(indexedDb.factory),
    ];
    const memory = createMemoryScoreChangesStore();
    for (const storeOf of stores) {
      const store = storeOf === stores[0] ? memory : storeOf();
      expect(await store.load(PLAYER)).toBeNull();
      await store.save(PLAYER, LOG);
      await store.save(OTHER, { baselined: false, changes: [] });
      const again = storeOf === stores[0] ? memory : storeOf();
      expect(await again.load(PLAYER)).toEqual(LOG);
      expect(await again.load(OTHER)).toEqual({ baselined: false, changes: [] });
    }
    expect([...indexedDb.tables.keys()]).toEqual(["changes"]);
  });
});
