import { describe, expect, test } from "bun:test";

import { sortOf } from "../src/shared/scores/score-order";
import { keepStartingSort, keptStartingSort } from "../src/shared/scores/starting-sort";
import { memoryStorage, refusing } from "./storage-fakes";

describe("keptStartingSort", () => {
  test("starts Scores on recent plays until another sort is chosen", () => {
    expect(keptStartingSort(memoryStorage())).toBe("recent");
  });

  test("keeps the sort chosen on this device, by name too", () => {
    const storage = memoryStorage();
    keepStartingSort("score", storage);
    expect(keptStartingSort(storage)).toBe("score");
    keepStartingSort("name", storage);
    expect(keptStartingSort(storage)).toBe("name");
  });

  test("falls back to recent plays for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.scoresSort", "loudest");
    expect(keptStartingSort(storage)).toBe("recent");
    expect(keptStartingSort(refusing)).toBe("recent");
  });
});

describe("sortOf", () => {
  test("turns by name into no sort chosen, and keeps every other", () => {
    expect(sortOf("name")).toBeNull();
    expect(sortOf("recent")).toBe("recent");
  });
});
