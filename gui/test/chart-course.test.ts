import { describe, expect, test } from "bun:test";

import { courseOf } from "../src/songs/chart-course";

describe("courseOf", () => {
  // Hand-written charts: no chart from a TJA collection is kept in this repository.
  test("finds a chart by the course's name or its number, the inner chart as Edit", () => {
    const text = [
      "TITLE:Test",
      "BPM:120",
      "COURSE:3",
      "#START",
      "1,",
      "#END",
      "COURSE:Edit",
      "#START",
      "2,",
      "#END",
      "COURSE:Easy",
      "#START",
      "1,",
      "#END",
    ].join("\n");
    expect(courseOf(text, "oni")).toEqual({ difficulty: "3" });
    expect(courseOf(text, "ura")).toEqual({ difficulty: "edit" });
    expect(courseOf(text, "easy")).toEqual({ difficulty: "easy" });
  });

  test("finds none for a chart the file lacks, or one only for two players", () => {
    const text = [
      "TITLE:Test",
      "BPM:120",
      "COURSE:Oni",
      "STYLE:Double",
      "#START P1",
      "1,",
      "#END",
      "#START P2",
      "2,",
      "#END",
    ].join("\n");
    expect(courseOf(text, "oni")).toBeNull();
    expect(courseOf(text, "hard")).toBeNull();
  });
});
