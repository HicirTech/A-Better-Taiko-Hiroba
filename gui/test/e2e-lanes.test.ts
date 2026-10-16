import { describe, expect, test } from "bun:test";

import type { LaneSection } from "../scripts/e2e/context";
import { mergeReports, newReport, printedReport, REPORT_MARK } from "../scripts/e2e/lane";
import { SECTIONS } from "../scripts/e2e/sections";

const section = (name: string, keys: string[]): LaneSection => ({
  name,
  phase: "signedIn",
  lane: "songs",
  keys,
  run: () => Promise.resolve(),
});

describe("e2e lanes", () => {
  test("no check belongs to two sections, so merging the lanes loses none", () => {
    const keys = SECTIONS.flatMap((one) => one.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("merges each lane's checks, tokens, errors and times", () => {
    const profile = {
      ...newReport(),
      results: { signedIn: true },
      tokens: ["a"],
      sectionMs: { overview: 5 },
    };
    const songs = {
      ...newReport(),
      results: { scored: false },
      errors: [{ section: "scores", message: "Timed out" }],
      sectionMs: { scores: 7 },
    };
    expect(mergeReports([profile, songs])).toEqual({
      results: { signedIn: true, scored: false },
      tokens: ["a"],
      medalIds: [],
      errors: [{ section: "scores", message: "Timed out" }],
      sectionMs: { overview: 5, scores: 7 },
    });
  });

  test("reads back the report a lane printed on its marked line, among other lines", () => {
    const printed = { ...newReport(), results: { scored: true }, sectionMs: { scores: 7 } };
    const lane = { name: "songs" as const, sections: [], exitCode: 0 };
    const output = `a stray line\n${REPORT_MARK}${JSON.stringify(printed)}\r\nanother one\n`;
    expect(printedReport(output, lane)).toEqual(printed);
  });

  test("fails each check of a lane that printed no report, and says how it ended", () => {
    const lane = {
      name: "songs" as const,
      sections: [section("scores", ["scored", "ranked"]), section("rating", ["rated"])],
      exitCode: 1,
    };
    expect(printedReport("", lane)).toEqual({
      ...newReport(),
      results: { scored: false, ranked: false, rated: false },
      errors: [
        { section: "songs lane", message: "Its process ended with code 1 and printed no report" },
      ],
    });
  });
});
