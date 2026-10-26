import type { Difficulty } from "./types";

/** ABTH CDN: ESE's charts drawn ahead of time, with their note counts, on GitHub Pages. */
export const ABTH_CDN_URL = "https://hicirtech.github.io/abth-cdn/";

/** A chart's drawing on ABTH CDN, from the CDN's own address. */
export const cdnChartPath = (songNo: string, difficulty: Difficulty): string =>
  `charts/${songNo}/${difficulty}.webp`;

/** A song's note counts on ABTH CDN, in the shape the apps keep them, from the CDN's address. */
export const cdnDensityPath = (songNo: string): string => `densities/${songNo}.json`;
