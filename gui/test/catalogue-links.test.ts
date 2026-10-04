import { describe, expect, test } from "bun:test";

import { CHART_PICTURE_HOSTS, chartOriginFor, isChartPictureAddress } from "../src/song-catalogue";

const STAND_IN = "http://hiroba.test:8807";

describe("isChartPictureAddress", () => {
  test("holds exactly the three hosts the song list links", () => {
    expect([...CHART_PICTURE_HOSTS].sort()).toEqual([
      "cdn.wikiwiki.jp",
      "file.taiko.wiki",
      "i.imgur.com",
    ]);
  });

  test.each([
    "https://file.taiko.wiki/fumen/670/oni",
    "https://file.taiko.wiki/img/0a1b2c3d-0000-4000-8000-000000000000",
    "https://cdn.wikiwiki.jp/to/w/taiko-fumen/%E3%81%82.png?rev=1&t=2",
    "https://i.imgur.com/abc123.png",
    "https://FILE.TAIKO.WIKI:443/fumen/670/oni",
  ])("takes %s", (address) => {
    expect(isChartPictureAddress(address, undefined)).toBe(true);
  });

  test.each([
    "http://file.taiko.wiki/fumen/670/oni",
    "ftp://file.taiko.wiki/fumen/670/oni",
    "https://file.taiko.wiki:8443/fumen/670/oni",
    "https://taiko.wiki/api/v1/song/all",
    "https://imgur.com/abc123.png",
    "https://www.file.taiko.wiki/x",
    "https://file.taiko.wiki.evil.test/x",
    "https://file.taiko.wiki@evil.test/x",
    "https://evil.test/?from=https://file.taiko.wiki/x",
    "https://evil.test/https://i.imgur.com/x",
    "file.taiko.wiki/fumen/670/oni",
    "//file.taiko.wiki/fumen/670/oni",
    "",
  ])("refuses %p", (address) => {
    expect(isChartPictureAddress(address, undefined)).toBe(false);
  });

  test("takes the stand-in's origin as well, when one is given, and only that origin", () => {
    expect(isChartPictureAddress(`${STAND_IN}/__charts/1001/oni-1.png`, STAND_IN)).toBe(true);
    expect(isChartPictureAddress(`${STAND_IN}/__charts/1001/oni-1.png`, `${STAND_IN}/`)).toBe(true);
    expect(isChartPictureAddress("https://file.taiko.wiki/fumen/670/oni", STAND_IN)).toBe(true);
    for (const address of [
      `${STAND_IN}/__charts/1001/oni-1.png`,
      "http://hiroba.test:8808/__charts/1001/oni-1.png",
      "http://img.test:8807/__charts/1001/oni-1.png",
      "https://hiroba.test:8807/__charts/1001/oni-1.png",
    ]) {
      expect(isChartPictureAddress(address, undefined)).toBe(false);
    }
    expect(isChartPictureAddress("http://hiroba.test:8808/x", STAND_IN)).toBe(false);
    expect(isChartPictureAddress("http://img.test:8807/x", STAND_IN)).toBe(false);
    expect(isChartPictureAddress("https://hiroba.test:8807/x", STAND_IN)).toBe(false);
  });

  test("takes only the chart hosts when the stand-in's origin is no address", () => {
    expect(isChartPictureAddress("https://i.imgur.com/abc123.png", "hiroba.test")).toBe(true);
    expect(isChartPictureAddress("http://hiroba.test/x", "hiroba.test")).toBe(false);
  });
});

describe("chartOriginFor", () => {
  test("gives a development run the origin it names, and none when it names none", () => {
    expect(chartOriginFor(true, STAND_IN)).toBe(STAND_IN);
    expect(chartOriginFor(true, undefined)).toBeUndefined();
    expect(chartOriginFor(true, "")).toBeUndefined();
  });

  test("gives a release none, whatever the environment says", () => {
    expect(chartOriginFor(false, STAND_IN)).toBeUndefined();
    expect(chartOriginFor(false, undefined)).toBeUndefined();
  });
});
