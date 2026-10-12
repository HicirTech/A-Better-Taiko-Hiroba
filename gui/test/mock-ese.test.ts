import { describe, expect, test } from "bun:test";
import { type ChartDensity, tjaDensities } from "@abth/core";

import {
  BRANCHED_CHART,
  ESE_CHARTS_PATH,
  ESE_MAPPING,
  eseChart,
  MISCOUNTED_CHART,
  MISSING_CHART,
  PLAIN_CHART,
} from "../scripts/mock-ese";
import { WIKI_SONGS } from "../scripts/mock-song-catalogue";
import { mappingOf } from "../src/song-catalogue/ese-chart-files";

const chartOf = (songNo: string) => {
  const address = mappingOf(JSON.stringify(ESE_MAPPING))?.get(songNo) ?? "";
  return eseChart(`${ESE_CHARTS_PATH}${address}`);
};
const notesOf = (density: ChartDensity | undefined) =>
  density === undefined ? null : density.branched ? density.lines.master.notes : density.line.notes;
const wikiCombo = (songNo: string, course: "easy" | "normal" | "hard" | "oni" | "ura") =>
  WIKI_SONGS.find((song) => song.songNo === songNo)?.courses[course]?.maxCombo ?? null;

describe("the stand-in's ESE", () => {
  test("serves each mapped chart with as many notes as the stand-in's song list counts", () => {
    const densities = tjaDensities(chartOf(PLAIN_CHART) ?? "");
    expect(notesOf(densities.get(1))).toBe(wikiCombo(PLAIN_CHART, "easy"));
    expect(notesOf(densities.get(4))).toBe(wikiCombo(PLAIN_CHART, "oni"));
  });

  test("branches the branched song's Oni chart, its master path counting the list's notes", () => {
    const oni = tjaDensities(chartOf(BRANCHED_CHART) ?? "").get(4);
    expect(oni?.branched).toBe(true);
    expect(notesOf(oni)).toBe(wikiCombo(BRANCHED_CHART, "oni"));
    expect(notesOf(tjaDensities(chartOf(BRANCHED_CHART) ?? "").get(5))).toBe(
      wikiCombo(BRANCHED_CHART, "ura"),
    );
  });

  test("gives one song's Oni chart a note more than the list, and has no file for another", () => {
    const oni = tjaDensities(chartOf(MISCOUNTED_CHART) ?? "").get(4);
    expect(notesOf(oni)).toBe((wikiCombo(MISCOUNTED_CHART, "oni") ?? 0) + 1);
    expect(chartOf(MISSING_CHART)).toBeNull();
  });
});
