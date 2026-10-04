import { err, ok, type Result, type TransportResponse } from "@abth/core";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
// "IHDR": the chunk a PNG gives first, with its width and height.
const IHDR = [0x49, 0x48, 0x44, 0x52] as const;

/** What an answer must be to count as a Hiroba picture; a check runs only if its rule is given. */
export interface PngRules {
  /** Fewer bytes than this is a placeholder, not the picture. */
  readonly minBytes?: number;
  /** More bytes than this is not the picture, and never crosses to the window. */
  readonly maxBytes: number;
  readonly signature?: boolean;
  /** The largest width and height the IHDR may give; it implies the signature check. */
  readonly maxSide?: number;
  /** The largest height, when lower than `maxSide`: for a picture wider than tall, such as a plate.
   * Read only with `maxSide`. */
  readonly maxHeight?: number;
  /** Where the final URL must be: a picture that moved is not the one asked for. */
  readonly at?: AskedPlace;
}

/** Where a picture was asked for: an origin, and a path with no query. */
export interface AskedPlace {
  readonly origin: string;
  readonly path: string;
}

export type PngRefusal =
  | { readonly why: "notPng" | "tooSmall" | "tooLarge" | "notPngBytes" | "movedTo" }
  | { readonly why: "badSize"; readonly width: number; readonly height: number };

/** A picture that passed: its bytes, and its size when the rules read it. */
export interface PngAnswer {
  readonly bytes: Uint8Array;
  readonly size: PngSize | null;
}

export interface PngSize {
  readonly width: number;
  readonly height: number;
}

/** Checks an answer by `rules`. The status is never looked at: Hiroba sends its "nothing to draw"
 * GIF, login page and error pages all at 200, so the content type goes first. */
export function checkPng(
  response: TransportResponse,
  rules: PngRules,
): Result<PngAnswer, PngRefusal> {
  const bytes = response.body;
  if (mediaTypeOf(response) !== "image/png") {
    return err({ why: "notPng" });
  }
  if (rules.minBytes !== undefined && bytes.byteLength < rules.minBytes) {
    return err({ why: "tooSmall" });
  }
  if (bytes.byteLength > rules.maxBytes) {
    return err({ why: "tooLarge" });
  }
  const readsSize = rules.maxSide !== undefined;
  if ((rules.signature === true || readsSize) && !hasPngSignature(bytes)) {
    return err({ why: "notPngBytes" });
  }
  let size: PngSize | null = null;
  if (rules.maxSide !== undefined) {
    size = pngSize(bytes);
    if (size === null) {
      return err({ why: "notPngBytes" });
    }
    const { width, height } = size;
    const maxHeight = Math.min(rules.maxSide, rules.maxHeight ?? rules.maxSide);
    if (width < 1 || height < 1 || width > rules.maxSide || height > maxHeight) {
      return err({ why: "badSize", width, height });
    }
  }
  if (rules.at !== undefined && !cameFrom(response.url, rules.at)) {
    return err({ why: "movedTo" });
  }
  return ok({ bytes, size });
}

/** The answer's media type, lower-cased and without its parameters; "" when it gave none. */
export function mediaTypeOf(response: TransportResponse): string {
  return (response.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

export function hasPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, at) => bytes[at] === byte);
}

/** The width and height a PNG's IHDR gives, or null when it has none where one must be. */
export function pngSize(bytes: Uint8Array): PngSize | null {
  if (bytes.byteLength < 24 || !hasPngSignature(bytes)) {
    return null;
  }
  if (!IHDR.every((byte, at) => bytes[12 + at] === byte)) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

// Long enough to name a player: a taiko number is 12 digits, a どんメダル plate's id 48 hex digits.
// A picture that moved may have moved to a path that names its player.
const MAY_NAME_A_PLAYER = /[0-9a-f]{16,}|\d{6,}/gi;

/** What came back, as codes a user can copy into a report: `offHost`, the final path if it differs
 * (runs that may name a player as `#`), then status, type and size. Never a host or a cookie. */
export function describeAnswer(
  response: TransportResponse,
  asked: { readonly path: string; readonly origin?: string },
): string {
  let path = "?";
  let origin: string | null = null;
  try {
    const url = new URL(response.url);
    path = url.pathname;
    origin = url.origin;
  } catch {
    // The final URL did not parse; "?" says so.
  }
  const offHost = asked.origin !== undefined && origin !== originOf(asked.origin);
  return [
    ...(offHost ? ["offHost"] : []),
    ...(path === asked.path ? [] : [`path=${path.replace(MAY_NAME_A_PLAYER, "#")}`]),
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ].join(" ");
}

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** `bytes` in base64. `btoa` exists in both shells. */
export function base64Of(bytes: Uint8Array): string {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x2000));
  }
  return btoa(binary);
}

/** A PNG as a `data:` URL, the only form a picture crosses in. */
export function pngDataUrl(bytes: Uint8Array): string {
  return `${PNG_DATA_URL_PREFIX}${base64Of(bytes)}`;
}

/** Whether `value` is a `pngDataUrl` of at most `maxBytes` bytes, as read back from storage. */
export function isPngDataUrl(value: unknown, maxBytes: number): value is string {
  if (typeof value !== "string" || !value.startsWith(PNG_DATA_URL_PREFIX)) {
    return false;
  }

  const encoded = value.slice(PNG_DATA_URL_PREFIX.length);
  if (encoded.length % 4 !== 0 || !BASE64.test(encoded)) {
    return false;
  }

  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return (encoded.length / 4) * 3 - padding <= maxBytes;
}

function cameFrom(finalUrl: string, asked: AskedPlace): boolean {
  try {
    const url = new URL(finalUrl);
    return url.origin === originOf(asked.origin) && url.pathname === asked.path;
  } catch {
    return false;
  }
}

function originOf(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}
