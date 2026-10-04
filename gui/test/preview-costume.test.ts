import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportRequest } from "@abth/core";

import { NO_LABEL_GIF } from "../scripts/mock-dan-label";
import { previewCostume, previewUrl } from "../src/hiroba-session";

const ENDPOINTS = {
  hirobaOrigin: "https://hiroba.test",
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const SET = {
  colorBody: 12,
  colorLimb: 13,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};
const PREVIEW_URL =
  "https://hiroba.test/imgsrc_mydon.php?face=5&body=12&limb=13&cos1=0&cos2=21&cos3=68&cos4=37&cos5=140";

type Answer = Awaited<ReturnType<Transport["send"]>>;

/** A PNG signature and `size - 8` more bytes: a picture as far as the checks look. */
function png(size: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (let at = 8; at < size; at++) {
    bytes[at] = (at * 31) % 256;
  }
  return bytes;
}

function answering(answer: Answer) {
  const asked: TransportRequest[] = [];
  const transport: Transport = {
    async send(request) {
      asked.push(request);
      return answer;
    },
  };
  return { transport, asked };
}

const image = (body: Uint8Array, type = "image/png", url = PREVIEW_URL): Answer =>
  ok({ status: 200, url, headers: { "content-type": type }, body });

describe("previewCostume", () => {
  test("asks once, by the site's names in the site's order, from the editor", async () => {
    expect(previewUrl(ENDPOINTS, SET)).toBe(PREVIEW_URL);
    const { transport, asked } = answering(image(png(4096)));
    await previewCostume(transport, ENDPOINTS, SET);
    expect(asked).toEqual([
      {
        method: "GET",
        url: PREVIEW_URL,
        headers: { Referer: "https://hiroba.test/mypage_kisekae.php" },
      },
    ]);
  });

  test("hands a PNG back as a data: URL of exactly its bytes", async () => {
    const body = png(70_000);
    const { transport } = answering(image(body, "image/png; charset=binary"));
    const preview = await previewCostume(transport, ENDPOINTS, SET);
    expect(preview.ok).toBe(true);
    const url = preview.ok ? preview.value : "";
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    const decoded = Uint8Array.from(atob(url.slice("data:image/png;base64,".length)), (c) =>
      c.charCodeAt(0),
    );
    expect(decoded).toEqual(body);
  });

  test("refuses Hiroba's no-session GIF, which comes at 200, with codes for a report", async () => {
    const { transport } = answering(image(NO_LABEL_GIF, "image/gif"));
    expect(await previewCostume(transport, ENDPOINTS, SET)).toEqual(
      err({ code: "preview=notPng status=200 type=image/gif bytes=43" }),
    );
  });

  test("names the path only when the answer ended elsewhere, and never a query", async () => {
    const login = new TextEncoder().encode("<form id=login_form></form>");
    const { transport } = answering(
      image(login, "text/html; charset=utf-8", "https://hiroba.test/login.php?from=face%3D5"),
    );
    const preview = await previewCostume(transport, ENDPOINTS, SET);
    expect(preview).toEqual(
      err({
        code: `preview=notPng path=/login.php status=200 type=text/html; charset=utf-8 bytes=${login.byteLength}`,
      }),
    );
  });

  test("refuses a PNG too small or too large to be a Don, or one that is not a PNG inside", async () => {
    const tooSmall = answering(image(png(500)));
    const tooLarge = answering(image(png(600 * 1024)));
    const notInside = answering(image(new Uint8Array(4096).fill(0x47)));
    expect(await previewCostume(tooSmall.transport, ENDPOINTS, SET)).toEqual(
      err({ code: "preview=tooSmall status=200 type=image/png bytes=500" }),
    );
    expect(await previewCostume(tooLarge.transport, ENDPOINTS, SET)).toEqual(
      err({ code: `preview=tooLarge status=200 type=image/png bytes=${600 * 1024}` }),
    );
    expect(await previewCostume(notInside.transport, ENDPOINTS, SET)).toEqual(
      err({ code: "preview=notPngBytes status=200 type=image/png bytes=4096" }),
    );
  });

  test("a request that fails is its kind alone, never its URL", async () => {
    const { transport } = answering(err({ kind: "timedOut", url: PREVIEW_URL }));
    expect(await previewCostume(transport, ENDPOINTS, SET)).toEqual(
      err({ code: "preview=timedOut" }),
    );
  });
});
