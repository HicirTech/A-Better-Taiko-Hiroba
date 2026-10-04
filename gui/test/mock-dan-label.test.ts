// A label core's reader refused would make the desktop run exercise the "couldn't read" path.
import { describe, expect, test } from "bun:test";
import { DAN_NAMES, readDanLabel } from "@abth/core";

import { danLabelPng, NO_LABEL_GIF } from "../scripts/mock-dan-label";

describe("the mock's dan labels", () => {
  test("each of the fifteen reads back as its own dan", () => {
    const read = DAN_NAMES.map((_, index) => readDanLabel(danLabelPng(index + 1)));
    expect(read).toEqual(DAN_NAMES.map((_, index) => ({ ok: true, value: { dan: index + 1 } })));
  });

  test("a named rank has no label template, so the mock has no label for it", () => {
    expect(() => danLabelPng(16)).toThrow("No label template for dan 16");
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
