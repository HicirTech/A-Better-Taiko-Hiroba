import { DAN_NAMES, isErr, readDanLabel, type Transport, type TransportResponse } from "@abth/core";

import type { DanView } from "../session-port";
import type { HirobaEndpoints } from "./types";

/** Where every dan label my page has shown lives: `imgsrc_danlabel.php?taiko_no=…`. */
const LABEL_PATH = "/imgsrc_danlabel.php";
/**
 * A label is a 96×40 PNG of a few kilobytes: the one weighed came to 4967 B (2026-08-09). Anything
 * sixteen times that is not a label, and is refused before it is decoded.
 */
const MAX_LABEL_BYTES = 64 * 1024;

/**
 * Reads the dan off the label my page shows, with one GET, and never fails the profile: whatever
 * goes wrong, from the request to the image, comes back as `unreadable` with codes for a report.
 *
 * `labelSrc` is the label's `src` as the page writes it, relative, and is resolved against Hiroba's
 * origin. A source that leads anywhere but Hiroba's label is not asked for.
 *
 * The label is public: Hiroba serves the same bytes with or without a cookie. What decides is the
 * content type and the size, never the status: Hiroba answers "nothing to draw" with a 43-byte 1×1
 * GIF at 200, and its login and error pages at 200 as well (wiki: Page Map, generated images). The
 * source carries the taiko number in its query, so no code holds the source, a query or a host;
 * the final path is named only when it is not the label's own.
 */
export async function readDan(
  transport: Transport,
  endpoints: HirobaEndpoints,
  labelSrc: string,
): Promise<DanView> {
  let url: URL;
  try {
    url = new URL(labelSrc, `${endpoints.hirobaOrigin}/`);
    if (url.origin !== new URL(endpoints.hirobaOrigin).origin || url.pathname !== LABEL_PATH) {
      return unreadable("dan=unexpectedSrc");
    }
  } catch {
    return unreadable("dan=unexpectedSrc");
  }

  const sent = await transport.send({ method: "GET", url: url.href });
  if (isErr(sent)) {
    return unreadable(`dan=${sent.error.kind}`);
  }
  const response = sent.value;
  const type = (response.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase();
  if (type !== "image/png") {
    return unreadable(`dan=notPng ${describe(response)}`);
  }
  if (response.body.byteLength > MAX_LABEL_BYTES) {
    return unreadable(`dan=tooLarge ${describe(response)}`);
  }
  const read = readDanLabel(response.body);
  if (isErr(read)) {
    const failure = read.error;
    const size =
      failure.kind === "notAnImage" && failure.width !== null
        ? ` size=${failure.width}x${failure.height}`
        : "";
    return unreadable(`dan=${failure.kind}${size} ${describe(response)}`);
  }
  const name = DAN_NAMES[read.value.dan - 1];
  return name === undefined ? unreadable(`dan=unnamed ${describe(response)}`) : { name };
}

function unreadable(code: string): DanView {
  return { unreadable: true, code };
}

/** What came back, as codes: the final path if it is not the label's, status, type and size. */
function describe(response: TransportResponse): string {
  let path = "?";
  try {
    path = new URL(response.url).pathname;
  } catch {
    // The final URL did not parse; "?" says so.
  }
  return [
    ...(path === LABEL_PATH ? [] : [`path=${path}`]),
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ].join(" ");
}
