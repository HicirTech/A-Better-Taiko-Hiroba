/** A player's result on one chart — one entity, however many pages feed it. */
import type { CrownState, Level, ScoreRank } from "./vocabulary";

/**
 * Which viewport last filled a score, in increasing order of completeness of source:
 * the genre list (crown and rank only), the detail page (everything), or the recent-plays page
 * (everything, for five recently played charts a page at a time).
 */
export type ScoreFidelity = "list" | "detail" | "recent";

/**
 * One score per player and chart — a single entity no matter which page filled it.
 *
 * `fidelity` and `record` are read together: at `list` fidelity a null record means the rest is
 * simply unknown yet, while at `detail` fidelity a null record means Hiroba itself answered
 * not-played (未プレイ) — known emptiness, not missing data. Partial is a normal state; sync uses
 * `fidelity` and `fetchedAt` to decide which charts still owe a detail fetch.
 */
export interface Score {
  readonly taikoNo: string;
  readonly songNo: string;
  readonly level: Level;
  readonly crown: CrownState;
  /**
   * Null when the chart has no ranked score. The rank sits beside `crown` rather than inside
   * the record because the genre list names both in one image — so a score's rank is knowable
   * at list fidelity, while the rest of its record is not.
   */
  readonly scoreRank: ScoreRank | null;
  readonly fidelity: ScoreFidelity;
  readonly record: ScoreRecord | null;
  readonly fetchedAt: string;
}

/** The full record the detail and recent-plays pages carry. */
export interface ScoreRecord {
  readonly highScore: number;
  /** 良 hits. */
  readonly good: number;
  /** 可 hits — matched without also matching 不可. */
  readonly ok: number;
  /** 不可 hits. */
  readonly bad: number;
  /** 連打 hits. */
  readonly drumroll: number;
  readonly maxCombo: number;
  readonly stageCount: number;
  readonly clearCount: number;
  readonly fullComboCount: number;
  readonly donderfulComboCount: number;
  readonly options: PlayOptions;
}

export type RandomMode = "none" | "kimagure" | "detarame";

/**
 * Decoded play options, from the `status_10_<code>` vocabulary both score pages share.
 * サポート譜面 is the asymmetry: only the recent-plays page exposes it, so it is null wherever
 * the source page cannot know it.
 */
export interface PlayOptions {
  /** Speed multiplier: 1, 1.1 … 1.9, 2, 2.5, 3, 3.5, 4. */
  readonly speed: number;
  readonly doron: boolean;
  readonly abekobe: boolean;
  readonly random: RandomMode;
  readonly supportChart: boolean | null;
}
