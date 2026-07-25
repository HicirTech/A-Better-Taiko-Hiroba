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

/** The rank image numbers Hiroba uses, `best_score_rank_2` through `_8`. */
export type ScoreRank = 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * One clear state across the whole model, fed by two asymmetric marker families. The score list
 * has `played` as its own marker; the detail page does not — there, `crown_large_0` with
 * `stageCnt > 0` is what `played` looks like. The enum keeps the distinction both pages can only
 * express together.
 */
export type CrownState = "none" | "played" | "silver" | "gold" | "donderful";
