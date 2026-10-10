import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";

import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  GENRE_COLOUR,
  GENRE_LABEL,
  GENRE_ORDER,
} from "../src/favorites/genre-look";
import { DIFFICULTIES } from "../src/song-catalogue/types";

describe("GENRE_ORDER", () => {
  test("lists the eight genres in the game's order, each once", () => {
    expect([...GENRE_ORDER]).toEqual([1, 3, 2, 4, 5, 7, 8, 6]);
  });

  test("gives each a colour of its own and a name", () => {
    const { t } = createTranslator("en");
    const colours = GENRE_ORDER.map((genre) => GENRE_COLOUR[genre]);
    expect(new Set(colours).size).toBe(8);
    expect(GENRE_ORDER.map((genre) => t(GENRE_LABEL[genre]))).toEqual([
      "POPS",
      "Kids",
      "Anime",
      "Vocaloid",
      "Game Music",
      "Variety",
      "Classic",
      "Namco Original",
    ]);
  });
});

describe("the charts", () => {
  test("have a colour of their own and a name each", () => {
    const { t } = createTranslator("en");
    expect(new Set(DIFFICULTIES.map((one) => DIFFICULTY_COLOUR[one])).size).toBe(5);
    expect(DIFFICULTIES.map((one) => t(DIFFICULTY_LABEL[one]))).toEqual([
      "Easy",
      "Normal",
      "Hard",
      "Extreme",
      "Extreme (Ura)",
    ]);
  });
});
