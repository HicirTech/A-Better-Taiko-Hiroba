import { DAN_NAMES, isErr, readDanLabel, type Transport, type TransportResponse } from "@abth/core";

import type { DanView, PictureView } from "../session-port";
import { checkPng, describeAnswer, pngDataUrl } from "./png-answer";
import type { HirobaEndpoints } from "./types";

/** Where every dan label my page has shown lives: `imgsrc_danlabel.php?taiko_no=…`. */
const LABEL_PATH = "/imgsrc_danlabel.php";
/**
 * A label is a 96×40 PNG of a few kilobytes: the one weighed came to 4967 B (2026-08-09). Anything
 * sixteen times that is not a label, and is refused before it is decoded.
 */
const MAX_LABEL_BYTES = 64 * 1024;
/** Far above a label's 96×40, and still a bound on what the window is handed to draw. */
const MAX_LABEL_SIDE = 512;

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
 *
 * The bytes the dan is read off also come back as the label's picture, for the window to show as
 * Hiroba does, at no cost of a request: only when they are a PNG of a label's size, from the
 * label's own address, and whether or not the dan read off them.
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
      return unreadable("dan=unexpectedSrc", null);
    }
  } catch {
    return unreadable("dan=unexpectedSrc", null);
  }

  const sent = await transport.send({ method: "GET", url: url.href });
  if (isErr(sent)) {
    return unreadable(`dan=${sent.error.kind}`, null);
  }
  const response = sent.value;
  // The type and the size only: the label's own reader says what else is wrong with its bytes.
  const checked = checkPng(response, { maxBytes: MAX_LABEL_BYTES });
  if (isErr(checked)) {
    return unreadable(`dan=${checked.error.why} ${describe(response)}`, null);
  }
  const picture = labelPicture(response, endpoints);
  const read = readDanLabel(checked.value.bytes);
  if (isErr(read)) {
    const failure = read.error;
    const size =
      failure.kind === "notAnImage" && failure.width !== null
        ? ` size=${failure.width}x${failure.height}`
        : "";
    return unreadable(`dan=${failure.kind}${size} ${describe(response)}`, picture);
  }
  const name = DAN_NAMES[read.value.dan - 1];
  return name === undefined
    ? unreadable(`dan=unnamed ${describe(response)}`, picture)
    : { name, picture };
}

/**
 * The label as a picture the window may show: the answer checked as every picture that crosses is,
 * a PNG by its type and bytes, within a label's bounds, from the label's own address. Null when it
 * is not one.
 */
function labelPicture(response: TransportResponse, endpoints: HirobaEndpoints): PictureView | null {
  const checked = checkPng(response, {
    maxBytes: MAX_LABEL_BYTES,
    maxSide: MAX_LABEL_SIDE,
    at: { origin: endpoints.hirobaOrigin, path: LABEL_PATH },
  });
  if (isErr(checked) || checked.value.size === null) {
    return null;
  }
  return { src: pngDataUrl(checked.value.bytes), ...checked.value.size };
}

function unreadable(code: string, picture: PictureView | null): DanView {
  return { unreadable: true, code, picture };
}

/** What came back, as codes: the final path if it is not the label's, status, type and size. */
function describe(response: TransportResponse): string {
  return describeAnswer(response, { path: LABEL_PATH });
}
