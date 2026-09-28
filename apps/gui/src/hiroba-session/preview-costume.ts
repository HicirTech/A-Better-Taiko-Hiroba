import { err, isErr, ok, type Result, type Transport, type TransportResponse } from "@abth/core";

import type { CostumePreviewFailure, CostumeSet } from "../session-port";
import { checkPng, describeAnswer, pngDataUrl } from "./png-answer";
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
  const checked = checkPng(response, {
    minBytes: MIN_PREVIEW_BYTES,
    maxBytes: MAX_PREVIEW_BYTES,
    signature: true,
  });
  if (isErr(checked)) {
    return failed(checked.error.why, response);
  }
  return ok(pngDataUrl(checked.value.bytes));
}

/** Codes for a report: why, then what came back, the final path only when not the preview's. */
function failed(why: string, response?: TransportResponse): Result<never, CostumePreviewFailure> {
  return err({
    code: [
      `preview=${why}`,
      ...(response ? [describeAnswer(response, { path: PREVIEW_PATH })] : []),
    ].join(" "),
  });
}
