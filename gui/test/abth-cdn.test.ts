import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { webpOf } from "../scripts/abth-cdn/encode";
import { workOf } from "../scripts/abth-cdn/work-list";
import { BRANCHED_CHART, eseChart, servedChartPath } from "../scripts/mock-ese";
import {
  densitiesByDifficulty,
  densityFile,
  keptDensities,
} from "../src/shared/song-catalogue/read-chart-density";
import { sniffPicture } from "../src/shared/song-catalogue/sniff-picture";

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: { r: 220, g: 60, b: 50, alpha: 1 } } })
    .png()
    .toBuffer();

describe("workOf", () => {
  test("takes the songs OurTaiko's map names, by number, with the paths as they lie in ESE", () => {
    const work = workOf(
      JSON.stringify({
        "12": "09 Namco Original\\Tenjiku 2000\\Tenjiku 2000.tja",
        "3": "01 Pop/Song/Song.tja",
        "4": "..\\Elsewhere.tja",
        "5": "01 Pop/Song/Song.ogg",
        six: "01 Pop/Song/Song.tja",
      }),
    );

    expect(work).toEqual([
      { songNo: "3", path: "01 Pop/Song/Song.tja" },
      { songNo: "12", path: "09 Namco Original/Tenjiku 2000/Tenjiku 2000.tja" },
    ]);
  });

  test("takes nothing from a map that is no map", () => {
    expect(workOf("not json")).toEqual([]);
  });
});

describe("webpOf", () => {
  test("keeps a drawing at its size, every channel within a few steps of the PNG", async () => {
    const drawn = await png(816, 400);

    const webp = await webpOf(drawn);

    expect(webp).not.toBeNull();
    expect(sniffPicture(webp ?? new Uint8Array())).toEqual({
      format: "webp",
      width: 816,
      height: 400,
    });
    const back = await sharp(webp ?? new Uint8Array())
      .ensureAlpha()
      .raw()
      .toBuffer();
    const before = await sharp(drawn).ensureAlpha().raw().toBuffer();
    const widest = back.reduce(
      (most, value, at) => Math.max(most, Math.abs(value - (before[at] ?? 0))),
      0,
    );
    expect(widest).toBeLessThanOrEqual(3);
  });

  test("leaves out a drawing taller than WebP can hold", async () => {
    expect(await webpOf(await png(816, 16384))).toBeNull();
  });
});

describe("densityFile", () => {
  test("publishes a song's numbers in the shape the apps keep and read back", () => {
    const tja = eseChart(servedChartPath(BRANCHED_CHART)) ?? "";
    const densities = densitiesByDifficulty(tja);

    expect(Object.keys(densities).length).toBeGreaterThan(0);
    expect(keptDensities(new TextEncoder().encode(densityFile(densities)))).toEqual(densities);
  });
});
