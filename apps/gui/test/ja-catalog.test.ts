/**
 * The Japanese catalog is Hiroba's own language, so what it names that core names from Hiroba is
 * core's: the score ranks, which the icons print as kanji, and the dan names.
 */
import { describe, expect, test } from "bun:test";
import { DAN_NAMES, SCORE_RANK_NAMES, type ScoreRank } from "@abth/core";
import { createTranslator, type MessageKey } from "@abth/i18n";

const { t } = createTranslator("ja");

describe("the Japanese catalog", () => {
  test("names each score rank as core does", () => {
    const ranks = Object.keys(SCORE_RANK_NAMES).map(Number) as ScoreRank[];
    expect(Object.fromEntries(ranks.map((rank) => [rank, t(`scoreRank.${rank}`)]))).toEqual(
      SCORE_RANK_NAMES,
    );
  });

  test("names each dan as core does, by its board number", () => {
    const named = DAN_NAMES.map((_, index) => t(`dan.${index + 1}` as MessageKey));
    expect(named).toEqual([...DAN_NAMES]);
  });
});
