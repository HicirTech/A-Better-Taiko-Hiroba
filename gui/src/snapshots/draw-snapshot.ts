import { toCanvas } from "html-to-image";

import { base64Of } from "../shared/png-answer";
import { inlinedFontFace } from "./font-faces";
import { SNAPSHOT_PIXEL_RATIO, SNAPSHOT_WEBP_QUALITY } from "./snapshot-picture";

/** `node` drawn and encoded once as `type`, fonts and pictures in it. */
export async function pictureOf(
  node: HTMLElement,
  type: "image/png" | "image/webp",
): Promise<Uint8Array> {
  const canvas = await toCanvas(node, {
    pixelRatio: SNAPSHOT_PIXEL_RATIO,
    fontEmbedCSS: await pageFonts(),
  });
  // Encoded here: html-to-image's toBlob drops the type it is given.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, SNAPSHOT_WEBP_QUALITY),
  );
  if (blob === null) {
    throw new Error("snapshot=noBlob");
  }
  // A browser that cannot encode the type gives a PNG, which the file's name would misname.
  if (blob.type !== type) {
    throw new Error(`snapshot=encodedAs-${blob.type}`);
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** The page's font faces, their files inlined, so the picture's words keep the page's widths. */
async function pageFonts(): Promise<string> {
  // html-to-image resolves a font's address in a scratch document, which cannot resolve it against
  // the desktop's app:// stylesheet; it then leaves the font out, and words wrap in another font.
  const faces = Array.from(document.styleSheets).flatMap((sheet) =>
    Array.from(sheet.cssRules)
      .filter((rule) => rule instanceof CSSFontFaceRule)
      .map((rule) => inlinedFontFace(rule.cssText, sheet.href ?? document.baseURI, dataUrlOf)),
  );
  return (await Promise.all(faces)).join("\n");
}

async function dataUrlOf(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`snapshot=font-status-${response.status}`);
  }
  const type = response.headers.get("content-type") ?? "application/octet-stream";
  return `data:${type};base64,${base64Of(new Uint8Array(await response.arrayBuffer()))}`;
}
