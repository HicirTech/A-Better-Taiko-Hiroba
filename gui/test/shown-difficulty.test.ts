import { describe, expect, test } from "bun:test";

import {
  keepShownDifficulty,
  keptShownDifficulty,
  type ShownDifficulty,
  shownFor,
  stackOf,
} from "../src/favorites/shown-difficulty";
import type { Difficulty } from "../src/song-catalogue/types";
import { memoryStorage, refusing } from "./storage-fakes";

const WITH_INNER = { easy: 3, normal: 5, hard: 7, oni: 9, ura: 10 } as const;
const NO_INNER = { easy: 2, normal: 3, hard: 5, oni: 7, ura: null } as const;

const parts = (levels: Readonly<Record<Difficulty, number | null>>, shown: ShownDifficulty) => {
  const { before, front, after } = stackOf(levels, shown);
  const names = (charts: typeof before) => charts.map(({ difficulty }) => difficulty);
  return [names(before), names(front), names(after)];
};

describe("keptShownDifficulty", () => {
  test("is Extreme until another is picked", () => {
    expect(keptShownDifficulty(memoryStorage())).toBe("oni");
  });

  test("keeps the difficulty picked on this device", () => {
    const storage = memoryStorage();
    keepShownDifficulty("hard", storage);
    expect(keptShownDifficulty(storage)).toBe("hard");
  });

  test("falls back to Extreme for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.shownDifficulty", "ura");
    expect(keptShownDifficulty(storage)).toBe("oni");
    expect(keptShownDifficulty(refusing)).toBe("oni");
  });
});

describe("stackOf", () => {
  test("puts Extreme and its inner chart in front, the rest stacked before them", () => {
    expect(parts(WITH_INNER, "oni")).toEqual([["easy", "normal", "hard"], ["oni", "ura"], []]);
    expect(parts(NO_INNER, "oni")).toEqual([["easy", "normal", "hard"], ["oni"], []]);
  });

  test("stacks the charts on either side of a difficulty in the middle", () => {
    expect(parts(WITH_INNER, "hard")).toEqual([["easy", "normal"], ["hard"], ["oni", "ura"]]);
    expect(parts(NO_INNER, "easy")).toEqual([[], ["easy"], ["normal", "hard", "oni"]]);
  });

  test("keeps each chart's level", () => {
    expect(stackOf(WITH_INNER, "oni").front).toEqual([
      { difficulty: "oni", level: 9 },
      { difficulty: "ura", level: 10 },
    ]);
  });

  test("shows every chart in front when the song lacks the shown difficulty", () => {
    const noHard = { ...NO_INNER, hard: null };
    expect(parts(noHard, "hard")).toEqual([[], ["easy", "normal", "oni"], []]);
  });
});

describe("shownFor", () => {
  test("shows the inner chart with Extreme and every other chart as itself", () => {
    expect(shownFor("ura")).toBe("oni");
    expect(shownFor("oni")).toBe("oni");
    expect(shownFor("normal")).toBe("normal");
  });
});
