/**
 * The checks every picture from Hiroba passes before its bytes cross to the window, and the codes an
 * answer that fails them is reported with.
 */
import { describe, expect, test } from "bun:test";
import { isErr, ok, type TransportResponse } from "@abth/core";
import { encode } from "fast-png";

import { NO_LABEL_GIF } from "../scripts/mock-dan-label";
import {
  checkPng,
  describeAnswer,
  type PngRules,
  pngDataUrl,
  pngSize,
} from "../src/hiroba-session/png-answer";

const ORIGIN = "https://hiroba.test";
const PATH = "/imgsrc_kisekae.php";
const ASKED = `${ORIGIN}${PATH}?cos=36&type=1`;
const RULES: PngRules = {
  minBytes: 128,
  maxBytes: 64 * 1024,
  maxSide: 512,
  at: { origin: ORIGIN, path: PATH },
};

/** A real PNG of `width` × `height`, drawn with some noise so it is not trivially small. */
function png(width: number, height: number): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(width * height * 4);
  for (let at = 0; at < data.length; at++) {
    data[at] = (at * 37) % 251;
  }
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}

function answer(
  body: Uint8Array,
  type = "image/png",
  url = ASKED,
  status = 200,
): TransportResponse {
  return { status, url, headers: { "content-type": type }, body };
}

/** Why `response` was refused under `rules`, or "passed". */
function why(response: TransportResponse, rules: PngRules = RULES): string {
  const checked = checkPng(response, rules);
  return isErr(checked) ? checked.error.why : "passed";
}

describe("checkPng", () => {
  test("passes a PNG within its bounds, with the size its IHDR gives", () => {
    const body = png(40, 32);
    expect(checkPng(answer(body, "image/png; charset=binary"), RULES)).toEqual(
      ok({ bytes: body, size: { width: 40, height: 32 } }),
    );
  });

  test("goes by the content type first, never by the status", () => {
    expect(why(answer(NO_LABEL_GIF, "image/gif"))).toBe("notPng");
    expect(why(answer(new TextEncoder().encode("<form id=login_form>"), "text/html"))).toBe(
      "notPng",
    );
    expect(why(answer(png(40, 40), "image/png", ASKED, 404))).toBe("passed");
  });

  test("refuses too few or too many bytes", () => {
    expect(why(answer(png(1, 1)))).toBe("tooSmall");
    const tooLarge = new Uint8Array(64 * 1024 + 1);
    tooLarge.set(png(40, 40));
    expect(why(answer(tooLarge))).toBe("tooLarge");
  });

  test("refuses bytes that are not a PNG, or a PNG with no IHDR first", () => {
    expect(why(answer(new Uint8Array(512).fill(0x47)))).toBe("notPngBytes");
    const noHeader = png(40, 40);
    noHeader.set([0x49, 0x44, 0x41, 0x54], 12);
    expect(why(answer(noHeader))).toBe("notPngBytes");
  });

  test("refuses a size out of bounds, and says what it was", () => {
    const tooWide = png(40, 40);
    new DataView(tooWide.buffer).setUint32(16, 513);
    expect(checkPng(answer(tooWide), RULES)).toEqual({
      ok: false,
      error: { why: "badSize", width: 513, height: 40 },
    });
    const empty = png(40, 40);
    new DataView(empty.buffer).setUint32(20, 0);
    expect(why(answer(empty))).toBe("badSize");
  });

  test("bounds the height apart, for a picture wider than it is tall", () => {
    const plate = { maxBytes: 256 * 1024, maxSide: 1280, maxHeight: 400 };
    const sized = (width: number, height: number) => {
      const body = png(40, 40);
      new DataView(body.buffer).setUint32(16, width);
      new DataView(body.buffer).setUint32(20, height);
      return answer(body);
    };
    expect(why(sized(1280, 400), plate)).toBe("passed");
    expect(why(sized(1281, 100), plate)).toBe("badSize");
    expect(why(sized(600, 401), plate)).toBe("badSize");
    // Never above the side it is read with.
    expect(why(sized(40, 513), { ...RULES, maxHeight: 1000 })).toBe("badSize");
  });

  test("refuses a picture that came from another origin or path than the one asked", () => {
    expect(why(answer(png(40, 40), "image/png", `https://elsewhere.test${PATH}`))).toBe("movedTo");
    expect(why(answer(png(40, 40), "image/png", `${ORIGIN}/imgsrc_mydon.php`))).toBe("movedTo");
    expect(why(answer(png(40, 40), "image/png", `${ORIGIN}${PATH}?cos=4&type=1`))).toBe("passed");
  });

  test("checks only what its rules ask for", () => {
    const notInside = answer(new Uint8Array(512).fill(0x47));
    expect(why(notInside, { maxBytes: 1024 })).toBe("passed");
    expect(why(notInside, { maxBytes: 1024, signature: true })).toBe("notPngBytes");
    expect(
      why(answer(png(40, 40), "image/png", "https://elsewhere.test/x"), { maxBytes: 64 * 1024 }),
    ).toBe("passed");
  });
});

describe("describeAnswer", () => {
  test("names the path only when the answer ended elsewhere, and the host never", () => {
    const login = answer(
      new TextEncoder().encode("<form>"),
      "text/html; charset=utf-8",
      `${ORIGIN}/login.php?from=cos%3D36`,
    );
    expect(describeAnswer(login, { path: PATH })).toBe(
      "path=/login.php status=200 type=text/html; charset=utf-8 bytes=6",
    );
    expect(describeAnswer(answer(NO_LABEL_GIF, "image/gif"), { path: PATH })).toBe(
      "status=200 type=image/gif bytes=43",
    );
  });

  test("says offHost, without the host, when asked where it should have come from", () => {
    const moved = answer(
      png(40, 40),
      "image/png",
      "https://elsewhere.test/imgsrc_kisekae.php?cos=36",
    );
    const code = describeAnswer(moved, { path: PATH, origin: ORIGIN });
    expect(code).toBe(`offHost status=200 type=image/png bytes=${moved.body.byteLength}`);
    expect(describeAnswer(moved, { path: PATH })).not.toContain("offHost");
    for (const text of [code, describeAnswer(moved, { path: "/x", origin: ORIGIN })]) {
      expect(text).not.toMatch(/elsewhere|hiroba\.test|http|\?|cos=/);
    }
  });
});

describe("pngDataUrl and pngSize", () => {
  test("a data: URL of exactly the bytes, and the size read off them", () => {
    const body = png(300, 200);
    const url = pngDataUrl(body);
    expect(url.startsWith("data:image/png;base64,iVBORw0KGgo")).toBe(true);
    const decoded = Uint8Array.from(atob(url.slice("data:image/png;base64,".length)), (c) =>
      c.charCodeAt(0),
    );
    expect(decoded).toEqual(body);
    expect(pngSize(body)).toEqual({ width: 300, height: 200 });
    expect(pngSize(NO_LABEL_GIF)).toBeNull();
  });
});
