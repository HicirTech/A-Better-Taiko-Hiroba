import { describe, expect, test } from "bun:test";

import type { Ctx, LanePortraits, LaneSection } from "../scripts/e2e/context";
import { newShared } from "../scripts/e2e/context";
import { mergeReports, newReport, printedReport, REPORT_MARK } from "../scripts/e2e/lane";
import { SECTIONS } from "../scripts/e2e/sections";
import { portraitRequests } from "../scripts/e2e/session";

const section = (name: string, keys: string[]): LaneSection => ({
  name,
  phase: "signedIn",
  lane: "songs",
  keys,
  run: () => Promise.resolve(),
});

const PROFILE_HIROBA = "http://hiroba.example:8907";
const SONGS_HIROBA = "http://hiroba.example:8937";
const bare = (hiroba: string) => ({
  query: "?v=&kind=mydon&fn=mydon_000000000000",
  referer: `${hiroba}/`,
  cookies: [],
});
const twoLanes = (): LanePortraits[] => [
  { hiroba: PROFILE_HIROBA, asked: [bare(PROFILE_HIROBA), bare(PROFILE_HIROBA)] },
  { hiroba: SONGS_HIROBA, asked: [bare(SONGS_HIROBA), bare(SONGS_HIROBA)] },
];
const contextWith = (results: Record<string, unknown>, portraits: LanePortraits[]): Ctx => ({
  results,
  tokens: [],
  medalIds: [],
  portraits,
  state: newShared(),
  get app(): never {
    throw new Error("No app after the lanes");
  },
});

describe("e2e lanes", () => {
  test("no check belongs to two sections, so merging the lanes loses none", () => {
    const keys = SECTIONS.flatMap((one) => one.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("merges each lane's checks, tokens, portraits, errors and times", () => {
    const profile = {
      ...newReport(),
      results: { signedIn: true },
      tokens: ["a"],
      portraits: [{ hiroba: PROFILE_HIROBA, asked: [bare(PROFILE_HIROBA)] }],
      sectionMs: { overview: 5 },
    };
    const songs = {
      ...newReport(),
      results: { scored: false },
      portraits: [{ hiroba: SONGS_HIROBA, asked: [] }],
      errors: [{ section: "scores", message: "Timed out" }],
      sectionMs: { scores: 7 },
    };
    expect(mergeReports([profile, songs])).toEqual({
      results: { signedIn: true, scored: false },
      tokens: ["a"],
      medalIds: [],
      portraits: [...profile.portraits, ...songs.portraits],
      errors: [{ section: "scores", message: "Timed out" }],
      sectionMs: { overview: 5, scores: 7 },
    });
  });

  test("passes My Don requests that went bare from each lane's own Hiroba", async () => {
    const results: Record<string, unknown> = {};
    await portraitRequests(contextWith(results, twoLanes()));
    expect(results.myDonSentNoCookie).toBe(true);
  });

  test("fails a My Don request sent with a cookie, or from another lane's Hiroba", async () => {
    const withCookie = twoLanes();
    withCookie[1]?.asked.push({ ...bare(SONGS_HIROBA), cookies: ["_token_v2=x"] });
    const crossed = twoLanes();
    crossed[1]?.asked.push(bare(PROFILE_HIROBA));
    for (const portraits of [withCookie, crossed]) {
      const results: Record<string, unknown> = {};
      await portraitRequests(contextWith(results, portraits));
      expect(results.myDonSentNoCookie).toBe(false);
    }
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
