import type { Level } from "./vocabulary";

/** Whether a dan is passed, and how well; not in the HTML, read from the plate image's stamp. */
export type DanClearState =
  | "none"
  | "redClear"
  | "redFullCombo"
  | "redDonderful"
  | "goldClear"
  | "goldFullCombo"
  | "goldDonderful";

/** Weakest first. The tier outranks the frame (虹枠赤 is below 銀枠金), so never sort the strings. */
export const DAN_CLEAR_STATE_ORDER: readonly DanClearState[] = [
  "none",
  "redClear",
  "redFullCombo",
  "redDonderful",
  "goldClear",
  "goldFullCombo",
  "goldDonderful",
];

export function isBetterDanClearState(candidate: DanClearState, current: DanClearState): boolean {
  return DAN_CLEAR_STATE_ORDER.indexOf(candidate) > DAN_CLEAR_STATE_ORDER.indexOf(current);
}

/** A dan-course record, not a score: one verdict per dan, and the run can end before all songs. */
export interface DanRecord {
  readonly taikoNo: string;
  /** Board order 1–15: kyu ranks take 1–5, dan ranks 6–15. The named ranks have no detail page. */
  readonly dan: number;
  readonly clearState: DanClearState;
  /** Whether the page holds a record (`p.head_error` empty); passing is `clearState`, not this. */
  readonly hasRecord: boolean;
  readonly totalScore: number | null;
  /** The whole run's six counts, null when all show `-`; not derivable from `songs`. */
  readonly totalCounts: DanSongCounts | null;
  readonly conditions: readonly DanCondition[];
  /** 条件毎の成績 — the best per condition, which need not come from the same attempt. */
  readonly conditionBests: readonly DanCondition[];
  readonly songs: readonly DanSongResult[];
  /** スコア更新日時 as printed; null when the page carries none. */
  readonly updatedAt: string | null;
  readonly fetchedAt: string;
}

/** `course` is one threshold for the run; `perSong` tightens it per 課題曲, one pair each. */
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
      /** One entry per 課題曲, in play order. */
      readonly songs: readonly DanConditionStep[];
    };

export interface DanConditionStep {
  readonly requirement: string;
  readonly achieved: string;
}

export interface DanSongResult {
  /** Null when the page masks the song as `？？？`. */
  readonly title: string | null;
  /** Null on a masked song, which ships no level icon; 5 is an ura chart. */
  readonly level: Level | null;
  /** Null when no per-song record is shown (unattempted; maybe also a run that ended early). */
  readonly record: DanSongCounts | null;
}

/** The six counts per 課題曲 and for the whole run; `maxCombo` chains across songs, never sum it. */
export interface DanSongCounts {
  readonly good: number;
  readonly ok: number;
  readonly bad: number;
  readonly drumroll: number;
  readonly maxCombo: number;
  /** 叩けた数; the score pages do not carry it. */
  readonly hits: number;
}

/** The fifteen dan names Hiroba prints in rows, in board order: `DAN_NAMES[n - 1]` is dan `n`. */
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

export function danNumberFromName(name: string): number | null {
  const index = DAN_NAMES.indexOf(name);
  return index === -1 ? null : index + 1;
}

/** Rows abbreviate フルコンボ and ドンダフルコンボ as フルコン and ドンダフル. */
const ROW_CLEAR_TIERS: Readonly<Record<string, DanClearState>> = {
  赤クリア: "redClear",
  赤フルコン: "redFullCombo",
  赤ドンダフル: "redDonderful",
  金クリア: "goldClear",
  金フルコン: "goldFullCombo",
  金ドンダフル: "goldDonderful",
};

export function danClearStateFromRowTier(tier: string): DanClearState | null {
  return ROW_CLEAR_TIERS[tier] ?? null;
}
