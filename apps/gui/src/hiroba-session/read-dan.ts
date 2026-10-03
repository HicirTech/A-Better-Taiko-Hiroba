import { isErr, readDanLabel, type Transport, type TransportResponse } from "@abth/core";

import { type DanNumber, type DanView, isWhole, type PictureView } from "../session-port";
import { checkPng, describeAnswer, pngDataUrl } from "./png-answer";
import type { HirobaEndpoints } from "./types";

const LABEL_PATH = "/imgsrc_danlabel.php";
// A label is a 96×40 PNG of a few kilobytes: anything far larger is refused before it is decoded.
const MAX_LABEL_BYTES = 64 * 1024;
/** Far above a label's 96×40, and still a bound on what the window is handed to draw. */
const MAX_LABEL_SIDE = 512;
/** The first and the last board number the catalog names: 五級, and 達人, the fourth named rank. */
const FIRST_DAN = 1;
const LAST_DAN = 19;

/** Reads the dan off the label my page shows with one GET; whatever goes wrong comes back as
 * `unreadable` with codes. The source holds the taiko number, so it is never named in them. */
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
  const board = read.value.dan;
  return isDanNumber(board)
    ? { board, picture }
    : unreadable(`dan=unnamed ${describe(response)}`, picture);
}

const isDanNumber = (board: number): board is DanNumber => isWhole(board, FIRST_DAN, LAST_DAN);

/** The label as a picture the window may show, checked like any picture; null when it fails. */
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

function describe(response: TransportResponse): string {
  return describeAnswer(response, { path: LABEL_PATH });
}
