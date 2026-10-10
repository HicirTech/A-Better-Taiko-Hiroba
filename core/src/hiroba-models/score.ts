import type { CrownState, Level, ScoreRank } from "./vocabulary";

/** Which page filled a score: `list` (crown and rank), `detail` or `recent`. Read the nulls. */
export type ScoreFidelity = "list" | "detail" | "recent";

/** One per player and chart. A null `record`: unknown at `list` fidelity, unplayed at `detail`. */
export interface Score {
  readonly taikoNo: string;
  readonly songNo: string;
  readonly level: Level;
  readonly crown: CrownState;
  /** Null when unranked. Kept beside `crown` because the genre list names both in one image. */
  readonly scoreRank: ScoreRank | null;
  readonly fidelity: ScoreFidelity;
  readonly record: ScoreRecord | null;
  readonly fetchedAt: string;
  /** My own detail page only: the Japan ranking's place, null where the page shows none. */
  readonly ranking?: number | null;
  /** My own detail page only: 区間毎詳細成績, none where the page lists none. */
  readonly sections?: readonly ScoreSection[];
}

/** One section of a chart: its own crown, score and hits. */
export interface ScoreSection {
  readonly crown: CrownState;
  readonly score: number;
  readonly good: number;
  readonly ok: number;
  readonly bad: number;
  readonly drumroll: number;
}

/** The four play counts are null where the page prints none, never 0; the rest always read. */
export interface ScoreRecord {
  readonly highScore: number;
  /** 良 hits. */
  readonly good: number;
  /** 可 hits. */
  readonly ok: number;
  /** 不可 hits. */
  readonly bad: number;
  /** 連打 hits. */
  readonly drumroll: number;
  readonly maxCombo: number;
  readonly stageCount: number | null;
  readonly clearCount: number | null;
  readonly fullComboCount: number | null;
  readonly donderfulComboCount: number | null;
  readonly options: PlayOptions;
}

export type RandomMode = "none" | "kimagure" | "detarame";

/** Decoded play options; `supportChart` is null unless the source (recent plays) exposes it. */
export interface PlayOptions {
  /** Speed multiplier: 1, 1.1 … 1.9, 2, 2.5, 3, 3.5, 4. */
  readonly speed: number;
  readonly doron: boolean;
  readonly abekobe: boolean;
  readonly random: RandomMode;
  readonly supportChart: boolean | null;
}
