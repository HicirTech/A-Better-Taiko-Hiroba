import { pngSize } from "../hiroba-session/png-answer";

export type PictureFormat = "png" | "jpeg" | "webp" | "gif";

interface PictureSize {
  readonly width: number;
  readonly height: number;
}

/** A picture's format and size, read off its own bytes. */
export interface SniffedPicture extends PictureSize {
  readonly format: PictureFormat;
}

type SizeReader = (bytes: Uint8Array) => PictureSize | null;

const SIZE_READERS: readonly (readonly [PictureFormat, SizeReader])[] = [
  ["png", pngSize],
  ["jpeg", jpegSize],
  ["webp", webpSize],
  ["gif", gifSize],
];

/** The format a picture's bytes show and the size its header gives; null for anything else. */
export function sniffPicture(bytes: Uint8Array): SniffedPicture | null {
  for (const [format, sizeOf] of SIZE_READERS) {
    const size = sizeOf(bytes);
    if (size !== null) {
      return size.width >= 1 && size.height >= 1 ? { format, ...size } : null;
    }
  }
  return null;
}

function holds(bytes: Uint8Array, offset: number, expected: string | readonly number[]): boolean {
  const codes =
    typeof expected === "string" ? Array.from(expected, (c) => c.charCodeAt(0)) : expected;
  return codes.every((code, index) => bytes[offset + index] === code);
}

const viewOf = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function gifSize(bytes: Uint8Array): PictureSize | null {
  if (bytes.byteLength < 10 || !(holds(bytes, 0, "GIF87a") || holds(bytes, 0, "GIF89a"))) {
    return null;
  }
  const view = viewOf(bytes);
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
}

const JPEG_START = [0xff, 0xd8, 0xff] as const;
const JPEG_FILL = 0xff;
const JPEG_END_OF_IMAGE = 0xd9;
const JPEG_START_OF_SCAN = 0xda;

// Baseline, extended sequential and progressive: browsers draw no other kind of frame.
const isJpegFrame = (marker: number) => marker >= 0xc0 && marker <= 0xc2;
// TEM, RST0 to RST7 and SOI stand alone, with no length.
const hasJpegLength = (marker: number) => marker !== 0x01 && !(marker >= 0xd0 && marker <= 0xd8);

function jpegSize(bytes: Uint8Array): PictureSize | null {
  if (!holds(bytes, 0, JPEG_START)) {
    return null;
  }
  const view = viewOf(bytes);
  let at = 2;
  while (at + 4 <= bytes.byteLength && view.getUint8(at) === JPEG_FILL) {
    const marker = view.getUint8(at + 1);
    if (marker === JPEG_FILL) {
      at += 1;
    } else if (isJpegFrame(marker)) {
      // After the marker and its length come the precision, the height and the width.
      return at + 9 <= bytes.byteLength
        ? { width: view.getUint16(at + 7), height: view.getUint16(at + 5) }
        : null;
    } else if (marker === JPEG_END_OF_IMAGE || marker === JPEG_START_OF_SCAN) {
      return null;
    } else {
      at += 2 + (hasJpegLength(marker) ? view.getUint16(at + 2) : 0);
    }
  }
  return null;
}

// The first chunk's data, after "RIFF", its size, "WEBP" and the chunk's own name and size.
const WEBP_DATA = 20;
const WEBP_KEY_FRAME_START = [0x9d, 0x01, 0x2a] as const;
const WEBP_LOSSLESS_SIGNATURE = [0x2f] as const;

function webpSize(bytes: Uint8Array): PictureSize | null {
  if (!holds(bytes, 0, "RIFF") || !holds(bytes, 8, "WEBP")) {
    return null;
  }
  const view = viewOf(bytes);
  if (holds(bytes, 12, "VP8 ")) {
    // 14 bits each; the top two bits are an upscaling hint that decoders ignore.
    return bytes.byteLength >= WEBP_DATA + 10 && holds(bytes, WEBP_DATA + 3, WEBP_KEY_FRAME_START)
      ? {
          width: view.getUint16(WEBP_DATA + 6, true) & 0x3fff,
          height: view.getUint16(WEBP_DATA + 8, true) & 0x3fff,
        }
      : null;
  }
  if (holds(bytes, 12, "VP8L")) {
    if (bytes.byteLength < WEBP_DATA + 5 || !holds(bytes, WEBP_DATA, WEBP_LOSSLESS_SIGNATURE)) {
      return null;
    }
    // Each side less one, 14 bits each.
    const packed = view.getUint32(WEBP_DATA + 1, true);
    return { width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 };
  }
  if (holds(bytes, 12, "VP8X") && bytes.byteLength >= WEBP_DATA + 10) {
    // The canvas less one, 24 bits each, after the flags and three reserved bytes.
    const uint24 = (at: number) => view.getUint16(at, true) + view.getUint8(at + 2) * 0x10000;
    return { width: uint24(WEBP_DATA + 4) + 1, height: uint24(WEBP_DATA + 7) + 1 };
  }
  return null;
}
