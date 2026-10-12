import { describe, expect, test } from "bun:test";

import {
  type ChartReading,
  type CrownState,
  capChanges,
  changeOf,
  EMPTY_SCORE_BOOK,
  foldDetail,
  isMilestone,
  logDetail,
  type Score,
  type ScoreBook,
  type ScoreChange,
  type ScoreChangeLog,
  type ScoreRecord,
  startingLog,
  withBaseline,
} from "../src/index";

import { detailOf, LATER, listed, READ_AT, RECORD } from "./score-fixtures";

/** A later reading of `score`'s chart with some of its record changed. */
const later = (score: Score, record: Partial<ScoreRecord>, crown = score.crown): Score => ({
  ...score,
  crown,
  fidelity: "detail",
  record: { ...RECORD, ...record },
  fetchedAt: LATER,
});
const bookOf = (...scores: Score[]): ScoreBook =>
  scores.reduce((book, score) => foldDetail(book, score), EMPTY_SCORE_BOOK);
const reading = (crown: CrownState): ChartReading => ({
  crown,
  scoreRank: null,
  highScore: null,
  stageCount: null,
  clearCount: null,
  fullComboCount: null,
  donderfulComboCount: null,
  fetchedAt: null,
});
const detailed = (crown: CrownState): ChartReading => ({ ...reading(crown), highScore: 900000 });
const crownChange = (from: CrownState, to: CrownState): ScoreChange => ({
  songNo: "100",
  level: 4,
  from: detailed(from),
  to: detailed(to),
});
const BASELINED: ScoreChangeLog = { baselined: true, changes: [] };

describe("changeOf", () => {
  test("takes a chart's first details over its list reading as a change", () => {
    const kept = listed("100", 4, "gold");
    expect(changeOf(kept, later(kept, {}))).toEqual({
      songNo: "100",
      level: 4,
      from: { ...reading("gold"), scoreRank: 5, fetchedAt: READ_AT },
      to: {
        crown: "gold",
        scoreRank: 5,
        highScore: 900000,
        stageCount: 2,
        clearCount: 2,
        fullComboCount: 0,
        donderfulComboCount: 0,
        fetchedAt: LATER,
      },
    });
  });

  test("starts from no reading at all for a chart the book never held", () => {
    const change = changeOf(undefined, detailOf(listed("100", 4)));
    expect(change?.from).toEqual(reading("none"));
  });

  test.each<[field: string, record: Partial<ScoreRecord>]>([
    ["the high score", { highScore: 900001 }],
    ["the play count", { stageCount: 3 }],
    ["the clears", { clearCount: 3 }],
    ["the full combos", { fullComboCount: 1 }],
    ["the donderful combos", { donderfulComboCount: 1 }],
  ])("takes a move in %s alone as a change", (_field, record) => {
    const kept = detailOf(listed("100", 4));
    expect(changeOf(kept, later(kept, record))).not.toBeNull();
  });

  test("takes a new crown or score rank alone as a change", () => {
    const kept = detailOf(listed("100", 4));
    expect(changeOf(kept, later(kept, {}, "gold"))?.to.crown).toBe("gold");
    expect(changeOf(kept, { ...later(kept, {}), scoreRank: 6 })?.to.scoreRank).toBe(6);
  });

  test("keeps no change for the same standing read again, whatever else moved", () => {
    const kept = { ...detailOf(listed("100", 4)), ranking: 1200, sections: [] };
    expect(changeOf(kept, later(kept, {}))).toBeNull();
    expect(changeOf(kept, { ...later(kept, { good: 401, ok: 19, maxCombo: 301 }) })).toBeNull();
    expect(changeOf(kept, { ...later(kept, {}), ranking: 900 })).toBeNull();
  });

  test("keeps no change for a page without details, or a reading older than the one kept", () => {
    const kept = detailOf(listed("100", 4), LATER);
    expect(changeOf(kept, { ...kept, record: null, fetchedAt: LATER })).toBeNull();
    expect(changeOf(kept, { ...later(kept, { highScore: 1 }), fetchedAt: READ_AT })).toBeNull();
  });
});

describe("isMilestone", () => {
  test.each<[from: CrownState, to: CrownState, milestone: boolean]>([
    ["none", "played", false],
    ["none", "silver", true],
    ["played", "gold", true],
    ["silver", "gold", true],
    ["gold", "donderful", true],
    ["silver", "silver", false],
    ["gold", "gold", false],
    ["gold", "silver", false],
  ])("from %p to %p is a milestone: %p", (from, to, milestone) => {
    expect(isMilestone(crownChange(from, to))).toBe(milestone);
  });

  test("counts a chart's first details as its milestone, whatever crown a list showed first", () => {
    expect(isMilestone({ ...crownChange("silver", "silver"), from: reading("silver") })).toBe(true);
    expect(isMilestone({ ...crownChange("played", "played"), from: reading("played") })).toBe(
      false,
    );
  });
});

describe("capChanges", () => {
  test("gives the same rows back while they fit", () => {
    const rows = [crownChange("silver", "silver")];
    expect(capChanges(rows, 1)).toBe(rows);
  });

  test("drops the oldest rows first, but never a milestone", () => {
    const first = crownChange("none", "silver");
    const plain = (stageCount: number) => ({
      ...crownChange("silver", "silver"),
      to: { ...reading("silver"), stageCount },
    });
    const rows = [first, plain(1), plain(2), plain(3), plain(4)];
    expect(capChanges(rows, 3)).toEqual([first, plain(3), plain(4)]);
  });

  test("keeps every milestone though they alone pass the cap", () => {
    const rows = [crownChange("none", "silver"), crownChange("silver", "gold")];
    expect(capChanges(rows, 1)).toEqual(rows);
  });
});

describe("logDetail", () => {
  const kept = detailOf(listed("100", 4));
  const book = bookOf(kept);

  test("keeps nothing before the first full read has ended", () => {
    const log = { baselined: false, changes: [] };
    expect(logDetail(log, book, later(kept, { highScore: 950000 }))).toBe(log);
  });

  test("adds a row for a change, and gives the same log back for none", () => {
    const added = logDetail(BASELINED, book, later(kept, { highScore: 950000 }));
    expect(added.changes.map(({ to }) => to.highScore)).toEqual([950000]);
    expect(logDetail(BASELINED, book, later(kept, {}))).toBe(BASELINED);
  });
});

describe("startingLog and withBaseline", () => {
  test("start a player whose book holds details as past the first full read", () => {
    expect(startingLog(bookOf(detailOf(listed("100", 4)))).baselined).toBe(true);
    expect(startingLog(EMPTY_SCORE_BOOK).baselined).toBe(false);
  });

  test("give a baselined log back as it is", () => {
    expect(withBaseline(BASELINED)).toBe(BASELINED);
    expect(withBaseline({ baselined: false, changes: [] }).baselined).toBe(true);
  });
});
