import { describe, expect, test } from "bun:test";

import { inlinedFontFace } from "../src/snapshots/font-faces";

// The desktop app's stylesheet and the font address Vite writes into it.
const SHEET = "app://gui/assets/index-A1b2.css";
const FACE = `@font-face { font-family: Roboto; font-weight: 700; src: url("./roboto-700-C3d4.woff2") format("woff2"), url(./roboto-700-E5f6.woff) format("woff"); }`;

/** Reads each address as a `data:` URL naming it, and notes what was asked. */
function reader() {
  const asked: string[] = [];
  const read = async (url: string) => {
    asked.push(url);
    return `data:font/test;base64,${btoa(url)}`;
  };
  return { asked, read };
}

describe("inlinedFontFace", () => {
  test("reads each font file at its address resolved against the app:// stylesheet", async () => {
    const { asked, read } = reader();
    await inlinedFontFace(FACE, SHEET, read);
    expect(asked).toEqual([
      "app://gui/assets/roboto-700-C3d4.woff2",
      "app://gui/assets/roboto-700-E5f6.woff",
    ]);
  });

  test("puts each file's data in place of its address, keeping the rest of the face", async () => {
    const { read } = reader();
    const inlined = await inlinedFontFace(FACE, SHEET, read);
    expect(inlined).toBe(
      `@font-face { font-family: Roboto; font-weight: 700; src: url(data:font/test;base64,${btoa("app://gui/assets/roboto-700-C3d4.woff2")}) format("woff2"), url(data:font/test;base64,${btoa("app://gui/assets/roboto-700-E5f6.woff")}) format("woff"); }`,
    );
  });

  test("reads a file named twice once, and leaves a data: URL as it is", async () => {
    const { asked, read } = reader();
    const face = `@font-face { src: url(./a.woff2), url('./a.woff2'), url(data:font/woff2;base64,AA==); }`;
    const inlined = await inlinedFontFace(face, SHEET, read);
    expect(asked).toEqual(["app://gui/assets/a.woff2"]);
    expect(inlined).toContain("url(data:font/woff2;base64,AA==)");
  });

  test("leaves a face that names no file as it is", async () => {
    const { asked, read } = reader();
    const face = "@font-face { font-family: Local; src: local(Arial); }";
    expect(await inlinedFontFace(face, SHEET, read)).toBe(face);
    expect(asked).toEqual([]);
  });
});
