export type Genre = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Ura is level 5 of the same song: it shares the song's `songNo` and is not a second song. */
export type Level = 1 | 2 | 3 | 4 | 5;

/** The rename-dialog script's flag: `'0'` is open, `'1'` closed; no readable flag is `unknown`. */
export type RenameState = "open" | "closed" | "unknown";

/** The rank image numbers Hiroba uses, `best_score_rank_2` through `_8`. */
export type ScoreRank = 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Japanese rank names by image number; read off the icons, since no page prints them as text. */
export const SCORE_RANK_NAMES: Readonly<Record<ScoreRank, string>> = {
  2: "白粋",
  3: "銅粋",
  4: "銀粋",
  5: "金雅",
  6: "桃雅",
  7: "紫雅",
  8: "虹極",
};

export interface ScoreRankTier {
  readonly name: string;
  readonly ranks: readonly ScoreRank[];
}

export const SCORE_RANK_TIERS: readonly ScoreRankTier[] = [
  { name: "粋", ranks: [2, 3, 4] },
  { name: "雅", ranks: [5, 6, 7] },
  { name: "極", ranks: [8] },
];

/** The score list marks `played` itself; detail pages do not, so see `playedOrNone`. */
export type CrownState = "none" | "played" | "silver" | "gold" | "donderful";

/** Played or not, from the play count: detail and recent-plays pages have no played marker. */
export function playedOrNone(stageCount: number): CrownState {
  return stageCount > 0 ? "played" : "none";
}
