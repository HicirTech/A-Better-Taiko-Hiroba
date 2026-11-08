import { describe, expect, test } from "bun:test";

import { MAX_RATING_SNAPSHOTS, type RatingSnapshot } from "@abth/core";

import { keptFileStore } from "../electron/kept-file-store";
import type { StoreFiles } from "../electron/replace-file";
import {
  createRatingHistory,
  KEPT_RATING_HISTORY,
  keptMemoryStore,
  NO_RATING_HISTORY,
  type RatingHistory,
  readStoredRatingHistory,
} from "../src/hiroba-session";
import { keptIndexedDbStore } from "../src/platform/kept-indexeddb-store";
import { createFakeIndexedDb } from "./indexeddb-fake";

const PLAYER = "000000000000";
const OTHER = "111111111111";

const snapshot = (at: string, rating: number): RatingSnapshot => ({
  at,
  figures: [
    { figure: "rating", value: rating, compensated: false },
    { figure: "stamina", value: 7.5, compensated: true },
  ],
  charts: [
    {
      songNo: "1178",
      level: 5,
      accuracy: 0.98,
      constant: 9.5,
      figures: { rating: 10.25, stamina: 8 },
    },
  ],
});
const HISTORY: RatingHistory = {
  ourtaikoV1: [snapshot("2026-10-13T00:00:00.000Z", 8.68)],
  ourtaikoV2: [snapshot("2026-10-13T00:00:00.000Z", 8.8)],
};

/** Files in memory, as the desktop store writes them. */
function fakeFiles(): StoreFiles {
  const disk = new Map<string, string>();
  return {
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
}

describe("readStoredRatingHistory", () => {
  test("reads a kept history back whole", () => {
    expect(readStoredRatingHistory(JSON.parse(JSON.stringify(HISTORY)))).toEqual(HISTORY);
  });

  test("reads what is no history as none", () => {
    expect(readStoredRatingHistory(undefined)).toBeNull();
    expect(readStoredRatingHistory("ratings")).toBeNull();
  });

  test("drops a snapshot or a chart that does not read, and keeps the others", () => {
    const good = snapshot("2026-10-13T00:00:00.000Z", 8.68);
    const read = readStoredRatingHistory({
      ourtaikoV1: [
        good,
        { at: 12, figures: [], charts: [] },
        { ...good, charts: [...good.charts, { songNo: "1178", level: 9 }] },
      ],
    });
    expect(read?.ourtaikoV1).toEqual([good, good]);
    expect(read?.ourtaikoV2).toEqual([]);
  });
});

describe("the rating history stores", () => {
  test("none until saved, then each player's own, on every platform", async () => {
    const files = fakeFiles();
    const indexedDb = createFakeIndexedDb();
    const memory = keptMemoryStore(KEPT_RATING_HISTORY);
    const stores = [
      () => memory,
      () => keptFileStore("", KEPT_RATING_HISTORY, files),
      () => keptIndexedDbStore(indexedDb.factory, KEPT_RATING_HISTORY),
    ];
    for (const storeOf of stores) {
      expect(await storeOf().load(PLAYER)).toEqual(NO_RATING_HISTORY);
      await storeOf().save(PLAYER, HISTORY);
      expect(await storeOf().load(PLAYER)).toEqual(HISTORY);
      expect(await storeOf().load(OTHER)).toEqual(NO_RATING_HISTORY);
    }
  });
});

describe("createRatingHistory", () => {
  const verbs = (owner: string | null = PLAYER) =>
    createRatingHistory({ store: keptMemoryStore(KEPT_RATING_HISTORY), owner: () => owner });

  test("keeps a rating per system, and answers those kept", async () => {
    const { ratingHistory, keepRating } = verbs();
    const first = snapshot("2026-10-13T00:00:00.000Z", 8.68);
    expect(await keepRating("ourtaikoV1", first)).toEqual([first]);
    expect(await ratingHistory("ourtaikoV1")).toEqual([first]);
    expect(await ratingHistory("ourtaikoV2")).toEqual([]);
  });

  test("keeps nothing new for a rating that says the same", async () => {
    const { keepRating } = verbs();
    const first = snapshot("2026-10-13T00:00:00.000Z", 8.68);
    await keepRating("ourtaikoV1", first);
    expect(await keepRating("ourtaikoV1", { ...first, at: "2026-10-14T00:00:00.000Z" })).toEqual([
      first,
    ]);
  });

  test("keeps both systems' ratings asked for at once", async () => {
    const { ratingHistory, keepRating } = verbs();
    const first = snapshot("2026-10-13T00:00:00.000Z", 8.68);
    await Promise.all([keepRating("ourtaikoV1", first), keepRating("ourtaikoV2", first)]);
    expect(await ratingHistory("ourtaikoV1")).toEqual([first]);
    expect(await ratingHistory("ourtaikoV2")).toEqual([first]);
  });

  test("holds the newest of a system up to the cap", async () => {
    const { keepRating } = verbs();
    let kept: readonly RatingSnapshot[] = [];
    for (let at = 0; at <= MAX_RATING_SNAPSHOTS; at += 1) {
      kept = await keepRating("ourtaikoV1", snapshot(`t${at}`, 8 + at / 1000));
    }
    expect(kept).toHaveLength(MAX_RATING_SNAPSHOTS);
    expect(kept[0]?.at).toBe("t1");
  });

  test("keeps nothing and answers nothing with no one signed in", async () => {
    const { ratingHistory, keepRating } = verbs(null);
    expect(await keepRating("ourtaikoV1", snapshot("t", 8))).toEqual([]);
    expect(await ratingHistory("ourtaikoV1")).toEqual([]);
  });
});
