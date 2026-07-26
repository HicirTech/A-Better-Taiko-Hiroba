/**
 * Whether a dan is passed, and how well. It exists nowhere in Hiroba's HTML — it is baked into
 * the plate image as a 合格 stamp and read back out of the image bytes.
 *
 * The game grades a dan on two axes, and the stamp draws both: the 合格 tier (赤 or 金, set by
 * how far past the pass conditions the attempt went) and the 枠 frame (銀 クリア, 金 フルコンボ,
 * 虹 ドンダフルコンボ), which the stamp shows as the swirl behind the glyphs. Six passing
 * combinations, all observed on real plates and in the site's own row text. The same six apply
 * to the named ranks 玄人 through 達人 exactly as they do to the numbered dan.
 */
export type DanClearState =
  | "none"
  | "redClear"
  | "redFullCombo"
  | "redDonderful"
  | "goldClear"
  | "goldFullCombo"
  | "goldDonderful";

/**
 * The game's own ranking of those states, weakest first.
 *
 * The tier outranks the frame: 虹枠赤合格 is *below* 銀枠金合格, which is not what "rainbow beats
 * silver" intuition suggests. A better result overwrites a worse one, so anything comparing two
 * attempts has to use this order rather than sorting the strings.
 */
export const DAN_CLEAR_STATE_ORDER: readonly DanClearState[] = [
  "none",
  "redClear",
  "redFullCombo",
  "redDonderful",
  "goldClear",
  "goldFullCombo",
  "goldDonderful",
];

/** True when `candidate` is a better result than `current`, per the game's ordering. */
export function isBetterDanClearState(candidate: DanClearState, current: DanClearState): boolean {
  return DAN_CLEAR_STATE_ORDER.indexOf(candidate) > DAN_CLEAR_STATE_ORDER.indexOf(current);
}

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
  /** From the plate image — the one place Hiroba records it. */
  readonly clearState: DanClearState;
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
