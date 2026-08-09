/**
 * Whether a dan is passed, and how well. It exists nowhere in Hiroba's HTML — it is baked into
 * the plate image as a 合格 stamp and read back out of the image bytes.
 *
 * The game grades a dan on two axes, and the stamp draws both: the 合格 tier (赤 or 金, set by
 * how far past the pass conditions the attempt went) and the 枠 frame (銀 クリア, 金 フルコンボ,
 * 虹 ドンダフルコンボ), which the stamp shows as the swirl behind the glyphs. Six passing
 * combinations. All six appear in the site's own row text across 600 sampled players; as *plates*
 * two of them — 赤フルコン and 赤ドンダフル — rest on two images each, so the classifier's
 * thresholds are better evidenced for the other four. That the same six apply to the named ranks
 * 玄人 through 達人 is the game's documented rule, not something anyone has seen: no account
 * holding one has ever been reachable.
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

/**
 * The fifteen dan names Hiroba prints, in board order, so `DAN_NAMES[n - 1]` is dan `n`.
 *
 * The numbers are the ones `dan_detail.php?dan=N` uses and the ones `DanRecord.dan` and the plate
 * reader already speak. This table exists so a **row of text** — the friend lists and the player
 * search are the only place on the site where a dan appears as text rather than as pixels — lands
 * on that same vocabulary instead of a second one.
 *
 * Fifteen and no more: the four named ranks (玄人 名人 超人 達人) have never appeared in a row,
 * because the search's `dan_id` filter stops at 十段 and a player whose highest dan is a named rank
 * is not listed under 十段. Derived from all 600 rows of the player sweep, which use exactly these
 * fifteen and nothing else.
 */
export const DAN_NAMES: readonly string[] = [
  "五級",
  "四級",
  "三級",
  "二級",
  "一級",
  "初段",
  "二段",
  "三段",
  "四段",
  "五段",
  "六段",
  "七段",
  "八段",
  "九段",
  "十段",
];

/** The board number for a printed dan name, or null for anything outside the fifteen. */
export function danNumberFromName(name: string): number | null {
  const index = DAN_NAMES.indexOf(name);
  return index === -1 ? null : index + 1;
}

/**
 * How a row abbreviates each clear tier, mapped onto the vocabulary the plate reader produces.
 *
 * **The site abbreviates in text what it spells in full elsewhere**: フルコン for フルコンボ and
 * ドンダフル for ドンダフルコンボ. All six occur in the 600-row sweep — the rarest, 赤ドンダフル,
 * four times — so this table is measured rather than assumed, and the row and the plate can be
 * compared directly.
 */
const ROW_CLEAR_TIERS: Readonly<Record<string, DanClearState>> = {
  赤クリア: "redClear",
  赤フルコン: "redFullCombo",
  赤ドンダフル: "redDonderful",
  金クリア: "goldClear",
  金フルコン: "goldFullCombo",
  金ドンダフル: "goldDonderful",
};

/** The clear state a row's tier text names, or null when it is not one of the six. */
export function danClearStateFromRowTier(tier: string): DanClearState | null {
  return ROW_CLEAR_TIERS[tier] ?? null;
}
