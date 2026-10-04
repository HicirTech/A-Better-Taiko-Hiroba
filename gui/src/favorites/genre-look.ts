import type { Genre } from "@abth/core";
import type { MessageKey } from "@abth/i18n";

import type { Difficulty } from "../song-catalogue/types";

/** The game's order: pops, kids, anime, vocaloid, game, variety, classic, namco. */
export const GENRE_ORDER = [1, 3, 2, 4, 5, 7, 8, 6] as const satisfies readonly Genre[];

export const GENRE_COLOUR: Readonly<Record<Genre, string>> = {
  1: "#4FB5BD",
  2: "#E28DC8",
  3: "#EBB850",
  4: "#A7ABC7",
  5: "#B697D3",
  6: "#EB6B6A",
  7: "#40C977",
  8: "#CCBD4A",
};

export const GENRE_LABEL = {
  1: "genre.pops",
  2: "genre.anime",
  3: "genre.kids",
  4: "genre.vocaloid",
  5: "genre.game",
  6: "genre.namco",
  7: "genre.variety",
  8: "genre.classic",
} as const satisfies Record<Genre, MessageKey>;

export const DIFFICULTY_COLOUR: Readonly<Record<Difficulty, string>> = {
  easy: "#FF2703",
  normal: "#647E2F",
  // The official green is lost on a dark page, so the dark scheme takes a lighter one.
  hard: "light-dark(#364938, #55755A)",
  oni: "#DB1885",
  ura: "#7135DB",
};

/** White reads on every chart's colour. */
export const DIFFICULTY_TEXT = "#fff";

export const DIFFICULTY_LABEL = {
  easy: "difficulty.easy",
  normal: "difficulty.normal",
  hard: "difficulty.hard",
  oni: "difficulty.oni",
  ura: "difficulty.ura",
} as const satisfies Record<Difficulty, MessageKey>;
