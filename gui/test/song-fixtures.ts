import type { CatalogueSong } from "../src/song-catalogue/types";

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
  ...overrides,
});
