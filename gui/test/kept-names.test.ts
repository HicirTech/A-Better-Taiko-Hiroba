import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EMPTY_SCORE_BOOK, type RecentPlay, type ScoreChangeLog } from "@abth/core";

import { DATA_FOLDER } from "../electron/data-folder";
import { keptFileStore } from "../electron/kept-file-store";
import { createPipelineHistoryStore } from "../electron/pipeline-history-store";
import {
  KEPT_COSTUME_HISTORY,
  KEPT_FOLDER_HISTORY,
  KEPT_RATING_HISTORY,
  KEPT_RECENT_PLAYS,
  KEPT_SCORE_CHANGES,
  KEPT_SCORES,
  NO_RATING_HISTORY,
} from "../src/hiroba-session";
import type { DatabaseFactory } from "../src/platform/capacitor-indexeddb";
import {
  CHART_DENSITY_DATABASE,
  CHART_PICTURE_DATABASE,
  createIndexedDbPictureStore,
  DRAWN_CHART_DATABASE,
} from "../src/platform/capacitor-picture-store";
import { createIndexedDbPipelineStores } from "../src/platform/capacitor-pipeline-store";
import { keptIndexedDbStore } from "../src/platform/kept-indexeddb-store";
import type { PictureKey } from "../src/shared/picture-store";
import type { PipelineHistory } from "../src/shared/pipelines";
import type { FolderHistoryEntry } from "../src/shared/session-port";
import { entryOf } from "./history-fixtures";
import { createFakeIndexedDb } from "./indexeddb-fake";

const PLAYER = "000000000000";
const OTHER = "111111111111";
const COSTUMES = [entryOf(1)];
const FOLDERS: FolderHistoryEntry[] = [{ songs: ["1061"], keptAt: 1, setName: null }];
const LOG: ScoreChangeLog = { baselined: true, changes: [] };
const PIPELINE: PipelineHistory = { ended: [] };
const NOTHING: PictureKey = { scope: "shared", player: null, name: "v1/nothing" };
const PLAYS: RecentPlay[] = [
  {
    songTitle: "サンプル曲A",
    genre: 1,
    level: 4,
    crown: "gold",
    scoreRank: 7,
    record: {
      highScore: 1_000_000,
      good: 500,
      ok: 10,
      bad: 0,
      drumroll: 20,
      maxCombo: 510,
      stageCount: null,
      clearCount: null,
      fullComboCount: null,
      donderfulComboCount: null,
      options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: false },
    },
  },
];

/** IndexedDB as Android's stores see it, noting each database opened and its version. */
function recordedIndexedDb() {
  const indexedDb = createFakeIndexedDb();
  const opened: [string, number][] = [];
  const factory: DatabaseFactory = {
    open(name, version) {
      opened.push([name, version]);
      return indexedDb.factory.open(name, version);
    },
  };
  return { factory, opened, tables: indexedDb.tables };
}

describe("what Android keeps, by name", () => {
  test("keeps each player's score book in abth-scores, table books, field book", async () => {
    const { factory, opened, tables } = recordedIndexedDb();
    await keptIndexedDbStore(factory, KEPT_SCORES).save(PLAYER, EMPTY_SCORE_BOOK);

    expect(opened).toEqual([["abth-scores", 1]]);
    expect(tables.get("books")?.get(PLAYER)).toEqual({ v: 1, book: EMPTY_SCORE_BOOK });
  });

  test("keeps each player's recent plays in abth-recent-plays, table plays, field plays", async () => {
    const { factory, opened, tables } = recordedIndexedDb();
    await keptIndexedDbStore(factory, KEPT_RECENT_PLAYS).save(PLAYER, PLAYS);

    expect(opened).toEqual([["abth-recent-plays", 1]]);
    expect(tables.get("plays")?.get(PLAYER)).toEqual({ v: 1, plays: PLAYS });
  });

  test("keeps score changes in abth-score-changes-2 and reads abth-score-changes for none", async () => {
    const { factory, opened, tables } = recordedIndexedDb();
    const store = keptIndexedDbStore(factory, KEPT_SCORE_CHANGES);
    await store.save(PLAYER, LOG);
    // The fake holds tables by name alone, so the earlier database's opening empties this one.
    expect(tables.get("changes")?.get(PLAYER)).toEqual({ v: 1, log: LOG });
    await store.load(OTHER);

    expect(opened).toEqual([
      ["abth-score-changes-2", 1],
      ["abth-score-changes", 1],
    ]);
  });

  test("keeps the rating history in abth-rating-history, table ratings, field history", async () => {
    const { factory, opened, tables } = recordedIndexedDb();
    await keptIndexedDbStore(factory, KEPT_RATING_HISTORY).save(PLAYER, NO_RATING_HISTORY);

    expect(opened).toEqual([["abth-rating-history", 1]]);
    expect(tables.get("ratings")?.get(PLAYER)).toEqual({ v: 1, history: NO_RATING_HISTORY });
  });

  test("keeps the two histories apart, each in table histories, field entries", async () => {
    const costume = recordedIndexedDb();
    await keptIndexedDbStore(costume.factory, KEPT_COSTUME_HISTORY).save(PLAYER, COSTUMES);
    const folder = recordedIndexedDb();
    await keptIndexedDbStore(folder.factory, KEPT_FOLDER_HISTORY).save(PLAYER, FOLDERS);

    expect(costume.opened).toEqual([["abth-costume-history", 1]]);
    expect(costume.tables.get("histories")?.get(PLAYER)).toEqual({ v: 1, entries: COSTUMES });
    expect(folder.opened).toEqual([["abth-folder-history", 1]]);
    expect(folder.tables.get("histories")?.get(PLAYER)).toEqual({ v: 1, entries: FOLDERS });
  });

  test("keeps each pipeline's history in abth-pipelines under the pipeline's name", async () => {
    const { factory, opened, tables } = recordedIndexedDb();
    await createIndexedDbPipelineStores(factory)("io").save(PIPELINE);

    expect(opened).toEqual([["abth-pipelines", 1]]);
    expect(tables.get("histories")?.get("io")).toEqual({ v: 1, history: PIPELINE });
  });

  test("keeps pictures, charts, densities and drawn charts in four databases", async () => {
    const { factory, opened } = recordedIndexedDb();
    const stores = [
      createIndexedDbPictureStore(factory),
      createIndexedDbPictureStore(factory, CHART_PICTURE_DATABASE),
      createIndexedDbPictureStore(factory, CHART_DENSITY_DATABASE),
      createIndexedDbPictureStore(factory, DRAWN_CHART_DATABASE),
    ];
    await Promise.all(stores.map((store) => store.get(NOTHING)));

    expect(opened).toEqual([
      ["abth-pictures", 1],
      ["abth-charts", 1],
      ["abth-densities", 1],
      ["abth-drawn-charts", 1],
    ]);
  });
});

describe("what the desktop keeps, by name", () => {
  const folder = mkdtempSync(join(tmpdir(), "abth-kept-names-"));
  afterAll(() => rmSync(folder, { recursive: true, force: true }));
  const kept = (name: string) => JSON.parse(readFileSync(join(folder, name), "utf8"));

  test("names every other file and folder in the data folder as earlier builds did", () => {
    expect(DATA_FOLDER).toEqual({
      session: "session.json",
      pipelines: "pipelines",
      pictures: "pictures",
      charts: "charts",
      densities: "densities",
      drawnCharts: "drawn-charts",
    });
  });

  test("keeps each kept thing in its file as version 1, every player under the taiko number", async () => {
    await keptFileStore(folder, KEPT_SCORES).save(PLAYER, EMPTY_SCORE_BOOK);
    await keptFileStore(folder, KEPT_RECENT_PLAYS).save(PLAYER, PLAYS);
    await keptFileStore(folder, KEPT_SCORE_CHANGES).save(PLAYER, LOG);
    await keptFileStore(folder, KEPT_RATING_HISTORY).save(PLAYER, NO_RATING_HISTORY);
    await keptFileStore(folder, KEPT_COSTUME_HISTORY).save(PLAYER, COSTUMES);
    await keptFileStore(folder, KEPT_FOLDER_HISTORY).save(PLAYER, FOLDERS);

    expect(kept("scores.json")).toEqual({ version: 1, players: { [PLAYER]: EMPTY_SCORE_BOOK } });
    expect(kept("recent-plays.json")).toEqual({ version: 1, players: { [PLAYER]: PLAYS } });
    expect(kept("score-changes-2.json")).toEqual({ version: 1, players: { [PLAYER]: LOG } });
    expect(kept("rating-history.json")).toEqual({
      version: 1,
      players: { [PLAYER]: NO_RATING_HISTORY },
    });
    expect(kept("costume-history.json")).toEqual({ version: 1, players: { [PLAYER]: COSTUMES } });
    expect(kept("folder-history.json")).toEqual({ version: 1, players: { [PLAYER]: FOLDERS } });
  });

  test("reads score changes an earlier build kept in score-changes.json, for none", async () => {
    writeFileSync(
      join(folder, "score-changes.json"),
      JSON.stringify({ version: 1, players: { [OTHER]: LOG } }),
    );

    expect(await keptFileStore(folder, KEPT_SCORE_CHANGES).load(OTHER)).toEqual(LOG);
  });

  test("keeps a pipeline's history as version 1, one file for each pipeline", async () => {
    const path = join(folder, "io.json");
    await createPipelineHistoryStore(path).save(PIPELINE);

    expect(kept("io.json")).toEqual({ version: 1, history: PIPELINE });
  });
});
