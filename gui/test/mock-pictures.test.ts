import { describe, expect, test } from "bun:test";
import { isOk } from "@abth/core";

import {
  blankPlatePng,
  chartPicturePng,
  chartPictureWidth,
  crownIconPng,
  medalPlatePng,
  myDonPng,
  rankIconPng,
  scorePanelPng,
  thumbnailPng,
  titlePlatePng,
} from "../scripts/mock-pictures";
import { CHART_PICTURE_PATHS } from "../scripts/mock-song-catalogue";
import { checkPng, type PngRules } from "../src/hiroba-session/png-answer";
import { sniffPicture } from "../src/song-catalogue/sniff-picture";

const sizeUnder = (body: Uint8Array, rules: PngRules) => {
  const checked = checkPng(
    {
      status: 200,
      url: "http://mock.test/picture.php",
      headers: { "content-type": "image/png" },
      body,
    },
    rules,
  );
  return isOk(checked) ? checked.value.size : null;
};

describe("thumbnailPng", () => {
  test("draws a 40×40 PNG within a thumbnail's bounds", () => {
    expect(
      sizeUnder(thumbnailPng(1, 36), { minBytes: 128, maxBytes: 64 * 1024, maxSide: 512 }),
    ).toEqual({ width: 40, height: 40 });
  });

  test("gives each item and slot a picture of its own, the same on every run", () => {
    expect(thumbnailPng(1, 36)).toEqual(thumbnailPng(1, 36));
    expect(thumbnailPng(1, 36)).not.toEqual(thumbnailPng(1, 37));
    expect(thumbnailPng(1, 21)).not.toEqual(thumbnailPng(2, 21));
  });
});

describe("titlePlatePng and blankPlatePng", () => {
  const PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280 };

  test("draw a 600×100 PNG within a plate's bounds, not the proportions the app reserves", () => {
    for (const plate of [titlePlatePng("サンプルの称号"), titlePlatePng(""), blankPlatePng()]) {
      expect(sizeUnder(plate, PLATE_RULES)).toEqual({ width: 600, height: 100 });
    }
  });

  test("give each title a plate of its own, the same on every run, and no one the blank", () => {
    expect(titlePlatePng("サンプルの称号")).toEqual(titlePlatePng("サンプルの称号"));
    expect(titlePlatePng("サンプルの称号")).not.toEqual(titlePlatePng("別のサンプル称号"));
    expect(titlePlatePng("サンプルの称号")).not.toEqual(titlePlatePng(""));
    expect(titlePlatePng("")).not.toEqual(blankPlatePng());
  });
});

describe("medalPlatePng", () => {
  const ID = "0123456789abcdef0123456789abcdef0123456789abcdef";
  const OTHER_ID = "fedcba9876543210fedcba9876543210fedcba9876543210";

  test("draws a 600×100 PNG within a plate's bounds, not the 290:50 the app reserves", () => {
    for (const plate of [medalPlatePng(ID, false), medalPlatePng(ID, true)]) {
      expect(sizeUnder(plate, { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280 })).toEqual({
        width: 600,
        height: 100,
      });
    }
  });

  test("gives each id and state a plate of its own, the same on every run", () => {
    expect(medalPlatePng(ID, false)).toEqual(medalPlatePng(ID, false));
    expect(medalPlatePng(ID, false)).not.toEqual(medalPlatePng(ID, true));
    expect(medalPlatePng(ID, false)).not.toEqual(medalPlatePng(OTHER_ID, false));
    expect(medalPlatePng(ID, false)).not.toEqual(blankPlatePng());
  });
});

describe("scorePanelPng", () => {
  const PANEL_RULES = { minBytes: 10 * 1024, maxBytes: 512 * 1024, maxSide: 1280, maxHeight: 800 };

  test("draws a 600×356 PNG within the panel's bounds", () => {
    expect(sizeUnder(scorePanelPng(5), PANEL_RULES)).toEqual({ width: 600, height: 356 });
  });

  test("gives each level a panel of its own, the same on every run", () => {
    expect(scorePanelPng(5)).toEqual(scorePanelPng(5));
    expect(scorePanelPng(5)).not.toEqual(scorePanelPng(4));
  });
});

describe("rankIconPng and crownIconPng", () => {
  const ICON_RULES = { minBytes: 128, maxBytes: 64 * 1024, maxSide: 256 };

  test("draw a 128×96 icon for each rank and a 52×59 one for each crown, within an icon's bounds", () => {
    for (const rank of [2, 3, 4, 5, 6, 7, 8]) {
      expect(sizeUnder(rankIconPng(rank), ICON_RULES)).toEqual({ width: 128, height: 96 });
    }
    for (const number of [1, 2, 3, 4]) {
      expect(sizeUnder(crownIconPng(number), ICON_RULES)).toEqual({ width: 52, height: 59 });
    }
  });

  test("give each rank and each crown an icon of its own, the same on every run", () => {
    expect(rankIconPng(5)).toEqual(rankIconPng(5));
    expect(rankIconPng(5)).not.toEqual(rankIconPng(6));
    expect(crownIconPng(2)).toEqual(crownIconPng(2));
    expect(crownIconPng(2)).not.toEqual(crownIconPng(3));
  });
});

describe("myDonPng", () => {
  const PORTRAIT_RULES = { minBytes: 5 * 1024, maxBytes: 512 * 1024, maxSide: 640 };
  const SET = [12, 12, 5, 0, 0, 68, 0, 0];

  test("draws a 290×290 PNG within a portrait's bounds", () => {
    expect(sizeUnder(myDonPng(SET), PORTRAIT_RULES)).toEqual({ width: 290, height: 290 });
  });

  test("gives each costume a portrait of its own, the same on every run", () => {
    expect(myDonPng(SET)).toEqual(myDonPng(SET));
    expect(myDonPng(SET)).not.toEqual(myDonPng([...SET.slice(0, 2), 3, ...SET.slice(3)]));
  });
});

describe("chartPicturePng", () => {
  const places = CHART_PICTURE_PATHS.map((_path, at) => at);

  test("draws a strip as wide as its place in the list says, which the app reads as a PNG", () => {
    for (const at of places) {
      expect(sniffPicture(chartPicturePng(at))).toEqual({
        format: "png",
        width: chartPictureWidth(at),
        height: 120,
      });
    }
  });

  test("gives each place a width and a picture of its own, the same on every run, small", () => {
    expect(new Set(places.map(chartPictureWidth)).size).toBe(places.length);
    expect(chartPicturePng(2)).toEqual(chartPicturePng(2));
    expect(chartPicturePng(2)).not.toEqual(chartPicturePng(3));
    for (const at of places) {
      expect(chartPicturePng(at).byteLength).toBeLessThan(20 * 1024);
    }
  });
});
