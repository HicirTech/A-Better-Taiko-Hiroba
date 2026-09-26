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
 * has `played` as its own marker; the detail page does not. Where the detail page prints a play
 * count — mine on every capture, another player's wherever it does — `played` is `crown_large_0`
 * with a positive `stageCount`. Where it prints none, as another player's did on the one capture
 * there is (2026-08-09), `played` is `crown_large_0` alone, and that is an inference — see
 * `playedOrNone`. The enum keeps the distinction both pages can only express together.
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
 * as on the one capture of it (2026-08-09). Where that page does print one, this rule decides, as
 * on mine.
 */
export function playedOrNone(stageCount: number): CrownState {
  return stageCount > 0 ? "played" : "none";
}
