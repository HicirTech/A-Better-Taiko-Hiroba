/**
 * A dan-course record — its own model, not a score. 段位道場 is a separate game mode: three set
 * songs, pass conditions with thresholds, and per-condition bests that need not come from one
 * attempt. Dan is absent by default; most fields survive exactly as Hiroba prints them because
 * the units are mixed (percent, counts) and the print is the contract.
 */
export interface DanRecord {
  readonly taikoNo: string;
  /** Board order 1–15: kyu ranks take 1–5, dan ranks 6–15. The named ranks have no detail page. */
  readonly dan: number;
  readonly totalScore: number | null;
  /** The best attempt's conditions: requirement vs achieved. */
  readonly conditions: readonly DanCondition[];
  /** 条件毎の成績 — the best per condition, which need not come from the same attempt. */
  readonly conditionBests: readonly DanCondition[];
  readonly songs: readonly DanSongResult[];
  /** スコア更新日時 as printed; null when the page carries none. */
  readonly updatedAt: string | null;
  readonly fetchedAt: string;
}

/** One pass condition as Hiroba prints it, e.g. 魂ゲージ / 98%以上 / 100%. */
export interface DanCondition {
  readonly name: string;
  readonly requirement: string;
  readonly achieved: string;
}

/** One of the three 課題曲 and its counts. */
export interface DanSongResult {
  readonly title: string;
  readonly good: number;
  readonly ok: number;
  readonly bad: number;
  readonly drumroll: number;
  readonly maxCombo: number;
}
