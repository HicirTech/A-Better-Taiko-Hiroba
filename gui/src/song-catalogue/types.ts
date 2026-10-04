import type { Genre } from "@abth/core";

/** A song's charts in the game's order; only some songs have an ura (おに裏). */
export const DIFFICULTIES = ["easy", "normal", "hard", "oni", "ura"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

/** One song as taiko.wiki describes it, cut to what the app shows and searches. */
export interface CatalogueSong {
  readonly songNo: string;
  /** The title the game in Japan shows. */
  readonly title: string;
  readonly titleEn: string | null;
  /** taiko.wiki's Simplified Chinese title. */
  readonly titleZh: string | null;
  readonly romaji: string | null;
  readonly artists: readonly string[];
  /** Hiroba's genre numbers, in the order taiko.wiki lists them. */
  readonly genres: readonly Genre[];
  /** Each chart's star level; null for a chart the song does not have. */
  readonly levels: Readonly<Record<Difficulty, number | null>>;
  readonly bpm: SongBpm | null;
  /** What each chart holds beyond its level; null for a chart the song does not have. */
  readonly charts: Readonly<Record<Difficulty, ChartFacts | null>>;
}

/** The lowest and highest BPM, equal for a steady song; `wobbles` where the tempo drifts. */
export interface SongBpm {
  readonly min: number;
  readonly max: number;
  readonly wobbles: boolean;
}

export interface ChartFacts {
  readonly maxCombo: number | null;
  readonly branched: boolean;
  /** Pictures of the chart's notes, as taiko.wiki links them, in its order. */
  readonly images: readonly string[];
}

/** One read of taiko.wiki's songs: all of them, or those changed since the read before. */
export interface SongCatalogueRead {
  /** Songs added or changed; every song when the read was a full one. */
  readonly songs: readonly CatalogueSong[];
  /** Song numbers taiko.wiki now marks deleted, to drop from what was kept. */
  readonly removed: readonly string[];
  /** When the request went out, in ms since 1970: the next read's `since`. */
  readonly sentAt: number;
}

/** A song page of the Chinese wiki: its title, the song's Japanese one, and its official names. */
export interface ChineseNamesPage {
  readonly title: string;
  readonly names: readonly string[];
}

/** The Chinese wiki's official song names, page by page. */
export interface ChineseNamesRead {
  readonly pages: readonly ChineseNamesPage[];
  /** When the first request went out, in ms since 1970. */
  readonly sentAt: number;
}

/** Codes, not sentences. */
export interface SongCatalogueFailure {
  readonly code: "notConfigured" | "unreachable" | "timedOut" | "badAnswer";
}
