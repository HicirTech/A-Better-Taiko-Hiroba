import { describe, expect, test } from "bun:test";

import { bpmText, openingChart } from "../src/songs/song-facts";

describe("bpmText", () => {
  test.each<[min: number, max: number, wobbles: boolean, text: string]>([
    [154, 154, false, "154"],
    [160, 300, false, "160–300"],
    [85.85, 257.5, false, "85.85–257.5"],
    [195.03, 195.03, false, "195.03"],
    [168, 168, true, "≈168"],
    [69.54, 282, true, "≈69.54–282"],
  ])("shows %p to %p, wobbling %p, as %p", (min, max, wobbles, text) => {
    expect(bpmText({ min, max, wobbles })).toBe(text);
  });
});

describe("openingChart", () => {
  const WITH_INNER = { easy: 3, normal: 5, hard: 6, oni: 7, ura: 8 };
  const NO_INNER = { ...WITH_INNER, ura: null };

  test("opens on the inner chart for Extreme when the song has one", () => {
    expect(openingChart(WITH_INNER, "oni")).toBe("ura");
  });

  test("opens on Extreme for a song with no inner chart", () => {
    expect(openingChart(NO_INNER, "oni")).toBe("oni");
  });

  test("opens on the difficulty shown first for the others", () => {
    expect(openingChart(WITH_INNER, "hard")).toBe("hard");
    expect(openingChart(WITH_INNER, "easy")).toBe("easy");
  });

  test("opens on the hardest chart a song has when it lacks the one shown first", () => {
    expect(openingChart({ ...NO_INNER, hard: null }, "hard")).toBe("oni");
  });

  test("opens on none for a song with no charts", () => {
    const none = { easy: null, normal: null, hard: null, oni: null, ura: null };
    expect(openingChart(none, "oni")).toBeNull();
  });
});
