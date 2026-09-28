/** The mock's synthetic thumbnails: real PNGs the app's checks pass, and each its own. */
import { describe, expect, test } from "bun:test";
import { isOk } from "@abth/core";

import { thumbnailPng } from "../scripts/mock-pictures";
import { checkPng } from "../src/hiroba-session/png-answer";

describe("thumbnailPng", () => {
  test("draws a 40×40 PNG within a thumbnail's bounds", () => {
    const body = thumbnailPng(1, 36);
    const checked = checkPng(
      {
        status: 200,
        url: "http://mock.test/imgsrc_kisekae.php",
        headers: { "content-type": "image/png" },
        body,
      },
      { minBytes: 128, maxBytes: 64 * 1024, maxSide: 512 },
    );
    expect(isOk(checked) && checked.value.size).toEqual({ width: 40, height: 40 });
  });

  test("gives each item and slot a picture of its own, the same on every run", () => {
    expect(thumbnailPng(1, 36)).toEqual(thumbnailPng(1, 36));
    expect(thumbnailPng(1, 36)).not.toEqual(thumbnailPng(1, 37));
    expect(thumbnailPng(1, 21)).not.toEqual(thumbnailPng(2, 21));
  });
});
