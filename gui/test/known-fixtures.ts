import type { KnownChart } from "../src/know-yourself/known-charts";

/** A cleared Extreme chart at ★8 with a few lost notes; every field can be overridden. */
export const known = (overrides: Partial<KnownChart> = {}): KnownChart => ({
  songNo: "1001",
  level: 4,
  difficulty: "oni",
  crown: "silver",
  scoreRank: 5,
  hits: { highScore: 900000, good: 500, ok: 20, bad: 5 },
  stars: 8,
  hitsPerSecond: 5.2,
  bpm: { min: 150, max: 150, wobbles: false },
  ...overrides,
});

/** A chart never played. */
export const unplayed = (overrides: Partial<KnownChart> = {}): KnownChart =>
  known({ crown: "none", scoreRank: null, hits: null, ...overrides });
