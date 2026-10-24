import { describe, expect, test } from "bun:test";

import { isCleared, isTried, knownCharts, shownAt } from "../src/know-yourself/known-charts";
import type { ListedChart, ListedChartsView } from "../src/shared/session-port";
import type { CatalogueSong } from "../src/shared/song-catalogue/types";
import { known } from "./known-fixtures";
import { chart, song } from "./song-fixtures";

const listedChart = (songNo: string, level: ListedChart["level"]): ListedChart => ({
  songNo,
  level,
  crown: "silver",
  scoreRank: 5,
  hits: { highScore: 900000, good: 500, ok: 20, bad: 5 },
});

const viewOf = (
  charts: readonly ListedChart[],
  titles: Record<string, string>,
): ListedChartsView => ({
  charts,
  songs: Object.entries(titles).map(([songNo, title]) => ({ songNo, title, genres: [1] })),
});

const catalogue = (...songs: CatalogueSong[]) => new Map(songs.map((one) => [one.songNo, one]));

describe("knownCharts", () => {
  test("gives each chart its stars, hits per second and tempo from the song list", () => {
    const songs = catalogue(
      song({
        songNo: "1001",
        levels: { easy: 2, normal: 3, hard: 5, oni: 7, ura: 9 },
        charts: {
          easy: chart(),
          normal: chart(),
          hard: chart(),
          oni: chart({ maxCombo: 600, playTime: 120 }),
          ura: chart({ maxCombo: 900, playTime: 120 }),
        },
      }),
    );

    const [oni, ura] = knownCharts(
      viewOf([listedChart("1001", 4), listedChart("1001", 5)], { 1001: "曲" }),
      songs,
    );

    expect(oni).toMatchObject({ difficulty: "oni", stars: 7, hitsPerSecond: 5 });
    expect(ura).toMatchObject({ difficulty: "ura", stars: 9, hitsPerSecond: 7.5 });
    expect(oni?.bpm).toEqual({ min: 150, max: 150, wobbles: false });
  });

  test("leaves out double-play songs", () => {
    const charts = knownCharts(
      viewOf([listedChart("1001", 4), listedChart("1002", 4)], {
        1001: "曲",
        1002: "【双打】曲",
      }),
      catalogue(song({ songNo: "1001" }), song({ songNo: "1002" })),
    );

    expect(charts.map((one) => one.songNo)).toEqual(["1001"]);
  });

  test("knows nothing of a song the list lacks, nor the hits per second of a chart with no time", () => {
    const charts = knownCharts(
      viewOf([listedChart("1001", 4), listedChart("1002", 4)], { 1001: "曲", 1002: "曲" }),
      catalogue(
        song({
          songNo: "1001",
          charts: { easy: null, normal: null, hard: null, oni: chart({ playTime: 0 }), ura: null },
        }),
      ),
    );

    expect(charts[0]).toMatchObject({ stars: 7, hitsPerSecond: null });
    expect(charts[1]).toMatchObject({ stars: null, hitsPerSecond: null, bpm: null });
  });
});

describe("shownAt", () => {
  test("Extreme holds the Oni and the inner charts", () => {
    const charts = [
      known({ level: 3, difficulty: "hard" }),
      known({ level: 4, difficulty: "oni" }),
      known({ level: 5, difficulty: "ura" }),
    ];

    expect(shownAt(charts, "oni").map((one) => one.level)).toEqual([4, 5]);
    expect(shownAt(charts, "hard").map((one) => one.level)).toEqual([3]);
  });
});

describe("isTried and isCleared", () => {
  test("a played chart is tried, and a clear or better crown is cleared", () => {
    expect(isTried(known({ crown: "none" }))).toBe(false);
    expect(isTried(known({ crown: "played" }))).toBe(true);
    expect(isCleared(known({ crown: "played" }))).toBe(false);
    expect(
      ["silver", "gold", "donderful"].every((crown) =>
        isCleared(known({ crown: crown as "silver" })),
      ),
    ).toBe(true);
  });
});
