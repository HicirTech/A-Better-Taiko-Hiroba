import type { Level } from "./vocabulary";

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
 * A dan-course record — its own model, not a score. 段位道場 is a separate game mode with rules the
 * rest of the site does not share, and two of them shape everything here:
 *
 * **Passing belongs to the dan, not to a song.** There is one verdict per dan — `clearState` — and
 * it is not assembled from the three songs. A song has a record; it does not have a pass.
 *
 * **The run can end before the songs do.** The three 課題曲 are played in order and a condition
 * broken on the first ends the attempt there, so the second and third are never reached. So a
 * missing song record is an ordinary outcome of a *played* dan, not only of an unplayed one, and
 * nothing may infer "not attempted" from it.
 *
 * Dan is absent by default — most accounts hold none, and that is not a parse failure. Most fields
 * survive exactly as Hiroba prints them because the units are mixed (percent, counts) and the print
 * is the contract.
 */
export interface DanRecord {
  readonly taikoNo: string;
  /** Board order 1–15: kyu ranks take 1–5, dan ranks 6–15. The named ranks have no detail page. */
  readonly dan: number;
  /** From the plate image — the one place Hiroba records it. */
  readonly clearState: DanClearState;
  /**
   * Whether the page holds a record for this dan at all, from its own `p.head_error`: empty when
   * there is one, `スコアが登録されてないドン！` when there is not.
   *
   * **It says "no score registered", which is not the same as "not passed"** — a dan attempted and
   * failed has a score. No capture separates the two, because this account has no failed dan, so
   * treating a false here as "unpassed" reads more into the page than it says. The verdict is
   * `clearState`, and it comes from the plate.
   */
  readonly hasRecord: boolean;
  readonly totalScore: number | null;
  /**
   * The best attempt's six counts across the whole run, or null when the page shows `-` for every
   * one of them. Not derivable from `songs`: `maxCombo` chains across songs rather than summing,
   * and a run that ended early has counts for fewer songs than the total covers.
   */
  readonly totalCounts: DanSongCounts | null;
  /** The best attempt's conditions: requirement vs achieved. */
  readonly conditions: readonly DanCondition[];
  /** 条件毎の成績 — the best per condition, which need not come from the same attempt. */
  readonly conditionBests: readonly DanCondition[];
  readonly songs: readonly DanSongResult[];
  /** スコア更新日時 as printed; null when the page carries none. */
  readonly updatedAt: string | null;
  readonly fetchedAt: string;
}

/**
 * One pass condition. **A condition is judged against the dan, never against a song** — see
 * `DanRecord` — but the page prints it in two shapes and they are not interchangeable.
 *
 * `course` is one threshold for the whole run: 魂ゲージ 100%以上. `perSong` is the *same* condition
 * tightened song by song — 可 under 18, then under 25, then under 30 — so it carries one
 * (requirement, achieved) pair per 課題曲 rather than one for the run. A reader that assumes one
 * pair per condition silently drops two thirds of the second shape.
 *
 * Both shapes appear on the same page: of the captured detail pages, 十段 mixes two of each and
 * 九段 three course conditions with one per-song. `requirement` and `achieved` stay as Hiroba
 * prints them, units and all (`100%以上`, `-回`), because the units are mixed and the print is the
 * contract.
 */
export type DanCondition =
  | {
      readonly kind: "course";
      readonly name: string;
      readonly requirement: string;
      readonly achieved: string;
    }
  | {
      readonly kind: "perSong";
      readonly name: string;
      /** One entry per 課題曲, in play order. Three on every captured page. */
      readonly songs: readonly DanConditionStep[];
    };

/** One 課題曲's threshold for a per-song condition, and what was achieved against it. */
export interface DanConditionStep {
  readonly requirement: string;
  readonly achieved: string;
}

/**
 * One of the three 課題曲.
 *
 * Every field is nullable, and each null means a different thing the page states plainly:
 *
 * - `title` is null when the page **masks** the song as `？？？`. 十段 does this to its second and
 *   third songs even though the dan is merely unattempted, while 九段 in the same state names all
 *   three — so masking is that dan's property, not a consequence of not having played it.
 * - `level` is null on a masked song, which ships no level icon at all. It can be `5`: a dan course
 *   may set an **ura** chart, and 四段's third song is one.
 * - `record` is null when there is no per-song record to show. An unattempted dan renders no
 *   `.scoreDetailTable` for any song. **A dan run can also stop early** — failing the first song
 *   ends the attempt, so the second and third are never played — and what the page renders for a
 *   song reached that way has **not been observed**: no captured dan is half-played, and
 *   `dan_detail.php` takes no `taiko_no`, so only this account's own history can produce one.
 */
export interface DanSongResult {
  readonly title: string | null;
  readonly level: Level | null;
  readonly record: DanSongCounts | null;
}

/**
 * The six counts this page keeps, per 課題曲 and again for the whole run.
 *
 * `hits` (叩けた数) is the sixth and is easy to miss — the score pages do not carry it. The
 * mapping from the site's `score_name_*` / `txt_score_00N` labels was settled by arithmetic on a
 * real record rather than by reading the labels: five of the six whole-run figures are exactly the
 * sum of their per-song values (良 1710, 可 400, 不可 25, 連打 146, 叩けた数 2256).
 *
 * **`maxCombo` is the exception and must never be summed**, because in this mode **the combo carries
 * across songs**. On the same record the three songs give 765, 454 and 252 while the run gives
 * 1219 — which is 765 + 454, the first two chained, with the third broken by that song's 24 不可.
 * So the whole-run figure is the longest unbroken run of the attempt and is neither the sum of the
 * three nor the largest of them.
 */
export interface DanSongCounts {
  readonly good: number;
  readonly ok: number;
  readonly bad: number;
  readonly drumroll: number;
  readonly maxCombo: number;
  readonly hits: number;
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
