import { err, isErr, ok, type Result, type Transport, type TransportResponse } from "@abth/core";

import type { CostumePreviewFailure, CostumeSet } from "../session-port";
import type { HirobaEndpoints } from "./types";

/** Hiroba's own My Don compositor: it draws whatever set its query names. */
const PREVIEW_PATH = "/imgsrc_mydon.php";
/**
 * The site's parameter names, in the order mydon.js's attrMydonImageSrc writes them, each with the
 * value of the set it carries.
 */
const PREVIEW_PARAMETERS = [
  ["face", "colorFace"],
  ["body", "colorBody"],
  ["limb", "colorLimb"],
  ["cos1", "costume1"],
  ["cos2", "costume2"],
  ["cos3", "costume3"],
  ["cos4", "costume4"],
  ["cos5", "costume5"],
] as const satisfies readonly (readonly [string, keyof CostumeSet])[];
/**
 * A real preview weighed 79228 B (2026-08-09), and Hiroba's "nothing to draw" is a 43-byte GIF.
 * A PNG under a kilobyte is a placeholder, not a Don.
 */
const MIN_PREVIEW_BYTES = 1024;
/** Six times the one weighed: anything larger is not a preview, and does not cross to the window. */
const MAX_PREVIEW_BYTES = 512 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Where Hiroba's editor points its preview for `set`: the site's names, in the site's order. */
export function previewUrl(endpoints: HirobaEndpoints, set: CostumeSet): string {
  const query = PREVIEW_PARAMETERS.map(([name, part]) => `${name}=${set[part]}`).join("&");
  return `${endpoints.hirobaOrigin}${PREVIEW_PATH}?${query}`;
}

/**
 * Hiroba's picture of `set`, as its editor shows one after every pick: one GET, never retried, and
 * answered as a `data:image/png` URL, so the window shows it without loading anything from Hiroba
 * and without the session. It changes nothing on Hiroba.
 *
 * The picture is drawn for the session: without one Hiroba answers a 43-byte 1×1 GIF, at 200, as it
 * answers its login and error pages (wiki: Page Map, generated images). So the content type, the
 * size and the PNG signature decide, never the status. A failure is codes only: why, status, type,
 * size, and the final path when it is not the preview's own. Never the URL or its query.
 *
 * The request names the editor as its Referer, as a picture Hiroba's own editor loads does: with a
 * session, Hiroba has only been seen answering requests made from its pages. The editor's form
 * token is not spent by it: Hiroba's own editor asks for these between its read and its save.
 */
export async function previewCostume(
  transport: Transport,
  endpoints: HirobaEndpoints,
  set: CostumeSet,
): Promise<Result<string, CostumePreviewFailure>> {
  const sent = await transport.send({
    method: "GET",
    url: previewUrl(endpoints, set),
    headers: { Referer: `${endpoints.hirobaOrigin}/mypage_kisekae.php` },
  });
  if (isErr(sent)) {
    return failed(sent.error.kind);
  }
  const response = sent.value;
  const type = (response.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase();
  const bytes = response.body;
  if (type !== "image/png") {
    return failed("notPng", response);
  }
  if (bytes.byteLength < MIN_PREVIEW_BYTES) {
    return failed("tooSmall", response);
  }
  if (bytes.byteLength > MAX_PREVIEW_BYTES) {
    return failed("tooLarge", response);
  }
  if (!PNG_SIGNATURE.every((byte, at) => bytes[at] === byte)) {
    return failed("notPngBytes", response);
  }
  return ok(`data:image/png;base64,${base64Of(bytes)}`);
}

function failed(why: string, response?: TransportResponse): Result<never, CostumePreviewFailure> {
  return err({ code: [`preview=${why}`, ...(response ? [describe(response)] : [])].join(" ") });
}

/** What came back, as codes: the final path if it is not the preview's, status, type and size. */
function describe(response: TransportResponse): string {
  let path = "?";
  try {
    path = new URL(response.url).pathname;
  } catch {
    // The final URL did not parse; "?" says so.
  }
  return [
    ...(path === PREVIEW_PATH ? [] : [`path=${path}`]),
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ].join(" ");
}

/** Base64 in the main process and in a WebView alike: both have `btoa`, neither needs a Buffer. */
function base64Of(bytes: Uint8Array): string {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x2000));
  }
  return btoa(binary);
}
