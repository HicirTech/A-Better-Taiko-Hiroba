/**
 * Hiroba's own vocabulary: the enumerations the site uses everywhere, owned by no single entity.
 * Everything here mirrors what the pages actually emit; nothing is an invention of ours.
 */

/** Genres as Hiroba numbers them, 1–8. */
export type Genre = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Difficulty levels, 1–4 plus ura. Ura is level 5 of the same song — it shares the song's
 * `songNo` and is not a second song.
 */
export type Level = 1 | 2 | 3 | 4 | 5;

/**
 * Whether Hiroba takes a rename, as my page writes it into the script that opens the rename
 * dialog: `'0'` is `open`, and `'1'`, for which the site shows "not right now" and opens nothing,
 * is `closed`. A page whose script has no flag this version can read is `unknown`: it never fails
 * the page, and a rename is then left to Hiroba to take or refuse.
 */
export type RenameState = "open" | "closed" | "unknown";

/** The rank image numbers Hiroba uses, `best_score_rank_2` through `_8`. */
export type ScoreRank = 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * The Japanese name of each score rank, keyed by its image number.
 *
 * **Read off the icons, printed nowhere on the site.** The seven `best_score_rank_<N>_640.png`
 * images each show the rank's kanji in its colour; no page names a rank in text, not in an `alt`, a
 * class or a label. So a client that shows a name supplies it: this is the Japanese table, which the
 * app's Japanese catalog is held equal to, the other languages being worded there. Copied from the
 * wiki's Reading-Score-List, which records how it was read.
 */
export const SCORE_RANK_NAMES: Readonly<Record<ScoreRank, string>> = {
  2: "白粋",
  3: "銅粋",
  4: "銀粋",
  5: "金雅",
  6: "桃雅",
  7: "紫雅",
  8: "虹極",
};

/** One tier of the rank ladder: the kanji the ranks in it share, and those ranks, lowest first. */
export interface ScoreRankTier {
  readonly name: string;
  readonly ranks: readonly ScoreRank[];
}

/**
 * The three tiers the seven ranks fall into, lowest first: 粋 (2–4), 雅 (5–7), 極 (8). The colour
 * rises inside each tier. Read off the same icons as `SCORE_RANK_NAMES`.
 */
export const SCORE_RANK_TIERS: readonly ScoreRankTier[] = [
  { name: "粋", ranks: [2, 3, 4] },
  { name: "雅", ranks: [5, 6, 7] },
  { name: "極", ranks: [8] },
];

/**
 * One clear state across the whole model, fed by two asymmetric marker families. The score list
 * has `played` as its own marker; the detail page does not. Where the detail page prints a play
 * count — mine on every capture, another player's wherever it does — `played` is `crown_large_0`
 * with a positive `stageCount`. Where it prints none, as another player's did on the one capture
 * there is, `played` is `crown_large_0` alone, and that is an inference — see `playedOrNone`. The
 * enum keeps the distinction both pages can only express together.
 */
export type CrownState = "none" | "played" | "silver" | "gold" | "donderful";

/**
 * What a no-crown image means, given how often the chart was played. The score list has a marker
 * of its own for played-but-not-cleared; the detail and recent-plays pages do not, and leave the
 * play count to say which it is. The rule lives here so those two pages cannot drift apart on it.
 *
 * The detail page is not quite "the same image either way": a never-played chart's page carries no
 * crown image at all (one capture), and `crown_large_0` has only been served for played charts.
 * That is what another player's reader falls back on where the page prints no play count to ask,
 * as on the one capture of it. Where that page does print one, this rule decides, as on mine.
 */
export function playedOrNone(stageCount: number): CrownState {
  return stageCount > 0 ? "played" : "none";
}
