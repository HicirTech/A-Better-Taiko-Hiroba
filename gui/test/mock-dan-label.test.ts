// A label core's reader refused would make the desktop run exercise the "couldn't read" path.
import { describe, expect, test } from "bun:test";
import { readDanLabel } from "@abth/core";

import { danLabelPng, NO_LABEL_GIF, unknownLabelPng } from "../scripts/mock-dan-label";

const DANS = Array.from({ length: 19 }, (_, index) => index + 1);

describe("the mock's dan labels", () => {
  test("each of the nineteen reads back as its own dan, the named ranks too", () => {
    const read = DANS.map((dan) => readDanLabel(danLabelPng(dan)));
    expect(read).toEqual(DANS.map((dan) => ({ ok: true, value: { dan } })));
  });

  test("a label in a styling never seen is one the reader cannot place", () => {
    for (const dan of [16, 17, 18, 19]) {
      const read = readDanLabel(unknownLabelPng(dan));
      expect(read.ok).toBe(false);
      expect(
        !read.ok && read.error.kind === "unreadableGlyph" && read.error.nearestDan,
      ).toBeTruthy();
    }
    expect(() => danLabelPng(20)).toThrow("No label template for dan 20");
  });

  test("the no-label answer is a 43-byte GIF, which the reader refuses as no image", () => {
    expect(NO_LABEL_GIF.byteLength).toBe(43);
    expect(new TextDecoder().decode(NO_LABEL_GIF.subarray(0, 6))).toBe("GIF89a");
    expect(readDanLabel(NO_LABEL_GIF)).toEqual({
      ok: false,
      error: { kind: "notAnImage", width: null, height: null },
    });
  });
});
