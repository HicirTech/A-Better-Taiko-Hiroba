import { CROWN_ORDER, type Genre } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import { HIROBA_LANG } from "../language/hiroba-lang";
import type { ScoreView } from "../session-port";
import { GENRE_ORDER, LEVEL_DIFFICULTY } from "../song-catalogue/genre-look";
import { type ShownDifficulty, shownFor } from "../song-catalogue/shown-difficulty";
import { nameLanguage, shownName } from "../song-catalogue/song-names";
import { fold, searchedNames } from "../song-catalogue/song-search";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";
import type { SongCatalogue } from "../song-catalogue/use-song-catalogue";

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

/** A sort as Settings offers it to start with: each of the page's sorts, or by name. */
export type SortChoice = ScoreSort | "name";
export const SORT_CHOICES = ["name", ...SCORE_SORTS] as const satisfies readonly SortChoice[];

export const SORT_LABEL = {
  name: "scores.sort.name",
  score: "scores.sort.score",
  rank: "scores.sort.rank",
  genre: "picker.genre",
  crown: "scores.sort.crown",
  plays: "scores.plays",
  fullCombos: "scores.fullCombos",
  clears: "scores.clears",
  recent: "scores.sort.recent",
} as const satisfies Record<SortChoice, MessageKey>;

/** The page's sort for a choice: by name is no sort chosen. */
export const sortOf = (choice: SortChoice): ScoreSort | null => (choice === "name" ? null : choice);

/** A chart's score as the page lists it: the song's name in the player's language, and more. */
export interface ListedScore {
  readonly score: ScoreView;
  readonly name: string;
  readonly nameLang: string;
  /** Every name of the song, folded as a search folds its query. */
  readonly searched: readonly string[];
  /** taiko.wiki's star level for the chart; null where its list lacks it. */
  readonly stars: number | null;
  /** taiko.wiki's genres for the song; none where its list lacks it. */
  readonly genres: readonly Genre[];
}

/** A chart's score as the page lists it, its song named as the player's language names it. */
export function listedOf(score: ScoreView, catalogue: SongCatalogue, locale: Translator["locale"]) {
  const song = catalogue.songs.get(score.songNo);
  const name = song === undefined ? score.songTitle : shownName(song, locale);
  const names = song === undefined ? [] : searchedNames(song);
  return {
    score,
    name,
    nameLang: song === undefined ? HIROBA_LANG : nameLanguage(song, name),
    searched: [score.songTitle, ...names].map(fold),
    stars: song?.levels[LEVEL_DIFFICULTY[score.level]] ?? null,
    genres: song?.genres ?? [],
  } satisfies ListedScore;
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
