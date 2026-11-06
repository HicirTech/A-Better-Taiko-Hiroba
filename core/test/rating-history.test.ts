import { describe, expect, test } from "bun:test";

import {
  type ChartReading,
  MAX_RATING_SNAPSHOTS,
  type PlayerRating,
  parseRatingData,
  pastRatings,
  type RatedScore,
  type RatingSnapshot,
  ratePlayer,
  type ScoreChange,
  snapshotOf,
  withSnapshot,
} from "../src/index";

const dayOf = (time: string) => time.slice(0, 10);
const THEN = "2026-10-01T10:00:00.000Z";
const NOW = "2026-10-05T10:00:00.000Z";
const NOTES = 1000;

const chart = {
  constant: 9.5,
  totalNotes: NOTES,
  rollSeconds: 0,
  balloonCount: 0,
  composite: 40,
  avgDensity: 40,
  instDensity: 50,
  separation: 20,
  bpmChange: 5,
  hsChange: 0,
};
const DATA = parseRatingData("ourtaikoV1", [
  { id: 100, title: "A", constants: { oni: chart } },
  { id: 200, title: "B", constants: { oni: chart } },
]);
if (DATA === null) {
  throw new Error("the data did not parse");
}

const scoreOf = (songNo: string, good: number, ok: number, highScore: number): RatedScore => ({
  songNo,
  level: 4,
  crown: "gold",
  record: {
    highScore,
    good,
    ok,
    bad: NOTES - good - ok,
    drumroll: 0,
    maxCombo: good,
    stageCount: 3,
    clearCount: 3,
    fullComboCount: 1,
    donderfulComboCount: 0,
    options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
  },
});
const reading = (highScore: number | null, hits: Partial<ChartReading> = {}): ChartReading => ({
  crown: "silver",
  scoreRank: 6,
  highScore,
  stageCount: 2,
  clearCount: 2,
  fullComboCount: 0,
  donderfulComboCount: 0,
  good: null,
  ok: null,
  bad: null,
  drumroll: null,
  maxCombo: null,
  fetchedAt: THEN,
  ...hits,
});
const row = (songNo: string, from: ChartReading): ScoreChange => ({
  songNo,
  level: 4,
  from,
  to: { ...reading(980_000), crown: "gold", fetchedAt: NOW },
});
const rated = (scores: readonly RatedScore[]): PlayerRating => ratePlayer(scores, DATA);
const totalOf = (rating: PlayerRating) => rating.figures[0]?.value ?? 0;

describe("snapshotOf", () => {
  test("keeps the figures and the 40 best charts", () => {
    const scores = Array.from({ length: 45 }, () => scoreOf("100", 990, 10, 995_000));
    const rating = { ...rated(scores), charts: Array(45).fill(rated(scores).charts[0]) };
    const snapshot = snapshotOf(rating, NOW);
    expect(snapshot.at).toBe(NOW);
    expect(snapshot.figures).toEqual(rating.figures);
    expect(snapshot.charts).toHaveLength(40);
  });
});

describe("withSnapshot", () => {
  const first = snapshotOf(rated([scoreOf("100", 900, 100, 950_000)]), THEN);
  const moved = snapshotOf(rated([scoreOf("100", 990, 10, 995_000)]), NOW);

  test("adds a rating that moved", () => {
    expect(withSnapshot([first], moved)).toEqual([first, moved]);
  });

  test("keeps the same list for a rating that says the same, whenever", () => {
    const kept = [first];
    expect(withSnapshot(kept, { ...first, at: NOW })).toBe(kept);
  });

  test("drops the oldest past the cap", () => {
    const many: RatingSnapshot[] = Array.from({ length: MAX_RATING_SNAPSHOTS }, (_, at) => ({
      ...first,
      at: `t${at}`,
    }));
    const kept = withSnapshot(many, moved);
    expect(kept).toHaveLength(MAX_RATING_SNAPSHOTS);
    expect(kept[0]?.at).toBe("t1");
    expect(kept.at(-1)).toEqual(moved);
  });
});

describe("pastRatings", () => {
  const today = [scoreOf("100", 980, 20, 990_000), scoreOf("200", 950, 50, 975_000)];

  test("takes logged hits as they were, as no estimate", () => {
    const from = reading(900_000, { good: 800, ok: 200, bad: 0, drumroll: 0, maxCombo: 500 });
    const [past] = pastRatings(today, [row("100", from)], DATA, dayOf, null);
    const asThen = [scoreOf("100", 800, 200, 900_000), today[1] as RatedScore];
    expect(past?.estimated).toBe(false);
    expect(past?.at).toBe(THEN);
    expect(totalOf(past?.rating as PlayerRating)).toBeCloseTo(totalOf(rated(asThen)), 10);
  });

  test("estimates hits not logged from the difference in score", () => {
    const [past, now] = pastRatings(today, [row("100", reading(940_000))], DATA, dayOf, null);
    expect(past?.estimated).toBe(true);
    expect(now?.estimated).toBe(false);
    // 50,000 points of a million are 5 % of the chart's notes.
    const asThen = [scoreOf("100", 930, 20, 940_000), today[1] as RatedScore];
    expect(totalOf(past?.rating as PlayerRating)).toBeCloseTo(totalOf(rated(asThen)), 10);
  });

  test("takes a chart out where it had no details", () => {
    const [past] = pastRatings(today, [row("100", reading(null))], DATA, dayOf, null);
    expect(past?.rating.charts.map(({ songNo }) => songNo)).toEqual(["200"]);
  });

  test("works out only the days before the first rating kept", () => {
    const rows = [row("100", reading(940_000))];
    expect(pastRatings(today, rows, DATA, dayOf, NOW).map(({ at }) => at)).toEqual([THEN]);
    expect(pastRatings(today, rows, DATA, dayOf, THEN)).toEqual([]);
  });
});
