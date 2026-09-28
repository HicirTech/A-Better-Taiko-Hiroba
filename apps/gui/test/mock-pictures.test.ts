/** The mock's synthetic pictures: real PNGs the app's checks pass, and each its own. */
import { describe, expect, test } from "bun:test";
import { isOk } from "@abth/core";

import { blankPlatePng, thumbnailPng, titlePlatePng } from "../scripts/mock-pictures";
import { checkPng, type PngRules } from "../src/hiroba-session/png-answer";

/** The size `body` has when checked as a PNG under `rules`, or null when it does not pass. */
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
  /** A title plate's bounds: from a kilobyte to 256 KiB, and at most 1280×400. */
  const PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280 };

  test("draw a 600×100 PNG within a plate's bounds, not the 290:47 the app reserves", () => {
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
