import type { CatalogueSong, ChartFacts } from "../src/song-catalogue/types";

/** A chart with a combo and no pictures; every field can be overridden. */
export const chart = (overrides: Partial<ChartFacts> = {}): ChartFacts => ({
  maxCombo: 300,
  branched: false,
  images: [],
  ...overrides,
});

/** A made-up song; every field can be overridden. */
export const song = (overrides: Partial<CatalogueSong> = {}): CatalogueSong => ({
  songNo: "1001",
  title: "サンプル曲アルファ",
  titleEn: null,
  titleZh: null,
  romaji: null,
  artists: [],
  genres: [1],
  levels: { easy: 2, normal: 3, hard: 5, oni: 7, ura: null },
  bpm: { min: 150, max: 150, wobbles: false },
  charts: { easy: chart(), normal: chart(), hard: chart(), oni: chart(), ura: null },
  ...overrides,
});
