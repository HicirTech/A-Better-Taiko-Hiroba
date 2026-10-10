import type { CrownState, Genre } from "@abth/core";

import { GENRE_ORDER, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { type ShownDifficulty, shownFor } from "../favorites/shown-difficulty";
import type { ScoreView } from "../session-port";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";

/** What the scores page sorts by; with none chosen it lists the songs by name. */
export const SCORE_SORTS = [
  "score",
  "rank",
  "genre",
  "crown",
  "plays",
  "fullCombos",
  "clears",
  "recent",
] as const;
export type ScoreSort = (typeof SCORE_SORTS)[number];

/** A chart's score as the page lists it: the song's name in the player's language, and more. */
export interface ListedScore {
  readonly score: ScoreView;
  readonly name: string;
  readonly nameLang: string;
  /** Every name of the song, folded as a search folds its query. */
  readonly searched: readonly string[];
  /** taiko.wiki's star level for the chart; null where its list lacks it. */
  readonly stars: number | null;
}

/** What the page narrows its charts to: any of the chosen of each part, and none leaves it open. */
export interface ScoreFilter {
  readonly genres: readonly Genre[];
  readonly difficulties: readonly Difficulty[];
  readonly stars: readonly number[];
}

/** The filter a visit starts with: Settings' difficulty, Extreme with its Ura charts. */
export const startingFilter = (shown: ShownDifficulty): ScoreFilter => ({
  genres: [],
  difficulties: DIFFICULTIES.filter((difficulty) => shownFor(difficulty) === shown),
  stars: [],
});

const CROWN_ORDER: Readonly<Record<CrownState, number>> = {
  donderful: 4,
  gold: 3,
  silver: 2,
  played: 1,
  none: 0,
};

export function matchesScore(listed: ListedScore, { genres, difficulties, stars }: ScoreFilter) {
  const { score } = listed;
  return (
    (genres.length === 0 || score.genres.some((genre) => genres.includes(genre))) &&
    (difficulties.length === 0 || difficulties.includes(LEVEL_DIFFICULTY[score.level])) &&
    (stars.length === 0 || (listed.stars !== null && stars.includes(listed.stars)))
  );
}

/** A folded query in any of the song's names; an empty one matches every chart. */
export const matchesSearch = (listed: ListedScore, folded: string): boolean =>
  folded === "" || listed.searched.some((name) => name.includes(folded));

/** The larger first, and one with none after every one with some. */
function largerFirst(left: number | null, right: number | null): number {
  if (left === null || right === null) {
    return left === right ? 0 : left === null ? 1 : -1;
  }
  return right - left;
}

/** Recent plays' order: the newest first, and a chart they no longer show after them all. */
function newestFirst(left: number | null, right: number | null): number {
  if (left === null || right === null) {
    return left === right ? 0 : left === null ? 1 : -1;
  }
  return left - right;
}

const GAME_ORDER: readonly Genre[] = GENRE_ORDER;

/** Where the song's first genre in the game's order stands. */
const genreRank = ({ score }: ListedScore): number =>
  Math.min(...score.genres.map((genre) => GAME_ORDER.indexOf(genre)));

const COMPARE: Readonly<
  Record<
    ScoreSort | "name",
    (left: ListedScore, right: ListedScore, names: Intl.Collator) => number
  >
> = {
  name: (left, right, names) => names.compare(left.name, right.name),
  score: (left, right) => right.score.record.highScore - left.score.record.highScore,
  rank: (left, right) => largerFirst(left.score.scoreRank, right.score.scoreRank),
  genre: (left, right) => genreRank(left) - genreRank(right),
  crown: (left, right) => CROWN_ORDER[right.score.crown] - CROWN_ORDER[left.score.crown],
  plays: (left, right) => largerFirst(left.score.record.stageCount, right.score.record.stageCount),
  fullCombos: (left, right) =>
    largerFirst(left.score.record.fullComboCount, right.score.record.fullComboCount),
  clears: (left, right) => largerFirst(left.score.record.clearCount, right.score.record.clearCount),
  recent: (left, right) => newestFirst(left.score.recent, right.score.recent),
};

/** Sorted by `sort` (by name with none), then by song number and level, so ties keep one order. */
export function sortScores(
  listed: readonly ListedScore[],
  sort: ScoreSort | null,
  names: Intl.Collator,
): ListedScore[] {
  const compare = COMPARE[sort ?? "name"];
  return [...listed].sort(
    (left, right) =>
      compare(left, right, names) ||
      Number(left.score.songNo) - Number(right.score.songNo) ||
      left.score.level - right.score.level,
  );
}
