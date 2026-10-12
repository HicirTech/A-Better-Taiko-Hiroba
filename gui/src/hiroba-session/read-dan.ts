import {
  isErr,
  readDanLabel,
  readDanPlate,
  type Transport,
  type TransportResponse,
} from "@abth/core";

import { type DanNumber, type DanView, isWhole, type PictureView } from "../session-port";
import { checkPng, describeAnswer, pngDataUrl } from "./png-answer";
import type { HirobaEndpoints } from "./types";

const LABEL_PATH = "/imgsrc_danlabel.php";
const PLATE_PATH = "/imgsrc_dani.php";
// A label is a 96×40 PNG of a few kilobytes: anything far larger is refused before it is decoded.
const MAX_LABEL_BYTES = 64 * 1024;
/** Far above a label's 96×40, and still a bound on what the window is handed to draw. */
const MAX_LABEL_SIDE = 512;
/** The first and the last board number the catalog names: 五級, and 達人, the fourth named rank. */
const FIRST_DAN = 1;
const LAST_DAN = 19;
/** 達人, 超人, 名人 and 玄人: no label of theirs has been seen, so their plates are read instead. */
const NAMED_RANKS = [19, 18, 17, 16] as const;
// A plate is a 640×198 PNG of tens of kilobytes.
const MAX_PLATE_BYTES = 256 * 1024;
const TAIKO_NO = /^\d{12}$/;

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
    if (failure.kind === "unreadableGlyph" && failure.nearestDan !== null) {
      const named = await readNamedRank(transport, endpoints, url);
      return typeof named === "number"
        ? { board: named, picture }
        : unreadable(`dan=unreadableGlyph ${named}`, picture);
    }
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

/** The highest named rank whose plate carries a stamp, asked from the highest down, or a code. */
async function readNamedRank(
  transport: Transport,
  endpoints: HirobaEndpoints,
  label: URL,
): Promise<DanNumber | string> {
  const taikoNo = label.searchParams.get("taiko_no");
  if (taikoNo === null || !TAIKO_NO.test(taikoNo)) {
    return "plate=noTaikoNo";
  }
  for (const dan of NAMED_RANKS) {
    const url = new URL(PLATE_PATH, `${endpoints.hirobaOrigin}/`);
    url.search = new URLSearchParams({ taiko_no: taikoNo, dan: String(dan), img: "0" }).toString();
    const sent = await transport.send({ method: "GET", url: url.href });
    if (isErr(sent)) {
      return `plate${dan}=${sent.error.kind}`;
    }
    const checked = checkPng(sent.value, {
      maxBytes: MAX_PLATE_BYTES,
      at: { origin: endpoints.hirobaOrigin, path: PLATE_PATH },
    });
    if (isErr(checked)) {
      return `plate${dan}=${checked.error.why} ${describeAnswer(sent.value, { path: PLATE_PATH })}`;
    }
    const plate = readDanPlate(checked.value.bytes, dan);
    if (isErr(plate)) {
      return `plate${dan}=${plate.error.kind}`;
    }
    if (plate.value.state !== "none") {
      return dan;
    }
  }
  return "plates=unstamped";
}

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
