import { err, isErr, ok, type Result, type Transport, type TransportResponse } from "@abth/core";

import type { CostumePreviewFailure, CostumeSet } from "../session-port";
import { checkPng, describeAnswer, pngDataUrl } from "./png-answer";
import type { HirobaEndpoints } from "./types";

/** Hiroba's own My Don compositor: it draws whatever set its query names. */
const PREVIEW_PATH = "/imgsrc_mydon.php";
// The site's parameter names, in the order its own script writes them.
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
// Hiroba's "nothing to draw" is a 43-byte GIF: a PNG under a kilobyte is a placeholder, not a Don.
const MIN_PREVIEW_BYTES = 1024;
// Anything larger is not a preview, and does not cross to the window.
const MAX_PREVIEW_BYTES = 512 * 1024;

export function previewUrl(endpoints: HirobaEndpoints, set: CostumeSet): string {
  const query = PREVIEW_PARAMETERS.map(([name, part]) => `${name}=${set[part]}`).join("&");
  return `${endpoints.hirobaOrigin}${PREVIEW_PATH}?${query}`;
}

/** Hiroba's picture of `set`, as its editor shows one after every pick: one GET, never retried,
 * as a `data:image/png` URL so the window loads nothing from Hiroba. It changes nothing there. */
export async function previewCostume(
  transport: Transport,
  endpoints: HirobaEndpoints,
  set: CostumeSet,
): Promise<Result<string, CostumePreviewFailure>> {
  const sent = await transport.send({
    method: "GET",
    url: previewUrl(endpoints, set),
    // The editor as Referer, like its own pictures. It spends no form token: Hiroba's editor asks
    // for these between its read and its save.
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

function failed(why: string, response?: TransportResponse): Result<never, CostumePreviewFailure> {
  return err({
    code: [
      `preview=${why}`,
      ...(response ? [describeAnswer(response, { path: PREVIEW_PATH })] : []),
    ].join(" "),
  });
}
