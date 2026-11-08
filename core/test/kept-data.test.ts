import { describe, expect, test } from "bun:test";

import {
  MAX_SCORE_CHANGES,
  readStoredRatingHistory,
  readStoredScoreBook,
  readStoredScoreChanges,
} from "../src/index";
import { BOOK, CHANGES, detailed, HISTORY, LOG, NO_HITS, snapshot } from "./kept-fixtures";

describe("readStoredScoreBook", () => {
  test("reads a kept book back whole", () => {
    expect(readStoredScoreBook(JSON.parse(JSON.stringify(BOOK)))).toEqual(BOOK);
  });

  test.each<[name: string, stored: unknown]>([
    ["nothing", undefined],
    ["another shape", { songs: [], scores: [] }],
    ["a book whose full read is not a yes or a no", { ...BOOK, full: "yes" }],
  ])("reads %s as none", (_name, stored) => {
    expect(readStoredScoreBook(stored)).toBeNull();
  });

  test("reads a chart kept before its ranking and sections were read as having none", () => {
    const { ranking: _ranking, sections: _sections, ...older } = detailed;
    const kept = { ...BOOK, scores: { "1178/5": older } };
    const read = readStoredScoreBook(JSON.parse(JSON.stringify(kept)));
    expect(read?.scores["1178/5"]?.ranking).toBeNull();
    expect(read?.scores["1178/5"]?.sections).toEqual([]);
  });

  test("drops a chart whose record is broken, and the mark that named it", () => {
    const broken = { ...BOOK, scores: { ...BOOK.scores, "1178/5": { ...detailed, record: {} } } };
    const read = readStoredScoreBook(JSON.parse(JSON.stringify(broken)));
    expect(Object.keys(read?.scores ?? {})).toEqual(["1178/4"]);
    expect(read?.stale).toEqual([]);
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

  test("reads a row kept before hits were logged, with none", () => {
    const { good, ok, bad, drumroll, maxCombo, ...before } = CHANGES[1]?.to ?? {};
    const read = readStoredScoreChanges({
      baselined: true,
      changes: [{ ...CHANGES[1], from: before, to: before }],
    });
    expect(read?.changes[0]?.to).toEqual({ ...before, ...NO_HITS } as never);
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
