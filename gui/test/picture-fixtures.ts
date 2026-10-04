/** Small pictures of each format the chart pictures may come in: built by hand, or by ffmpeg. */
import { encode } from "fast-png";

const fromBase64 = (encoded: string) => Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
export const text = (value: string) => Array.from(value, (c) => c.charCodeAt(0));
const u16le = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
const u16be = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const u24le = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff];
export const u32le = (n: number) => [...u24le(n), (n >>> 24) & 0xff];

export function png(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  return new Uint8Array(encode({ width, height, data, channels: 4 }));
}

export const gif = (width: number, height: number, version = "GIF89a") =>
  Uint8Array.from([...text(version), ...u16le(width), ...u16le(height), 0, 0, 0]);

export const segment = (marker: number, data: readonly number[]) => [
  0xff,
  marker,
  ...u16be(data.length + 2),
  ...data,
];
export const frame = (marker: number, width: number, height: number) =>
  segment(marker, [8, ...u16be(height), ...u16be(width), 1, 1, 0x11, 0]);
export const jpeg = (...parts: readonly (readonly number[])[]) =>
  Uint8Array.from([0xff, 0xd8, ...parts.flat(), 0xff, 0xd9]);

export const riff = (chunk: readonly number[]) =>
  Uint8Array.from([...text("RIFF"), ...u32le(chunk.length + 4), ...text("WEBP"), ...chunk]);
export const lossy = (width: number, height: number, scale = 0) =>
  riff([
    ...text("VP8 "),
    ...u32le(10),
    ...[0x10, 0x05, 0x00, 0x9d, 0x01, 0x2a],
    ...u16le(width | (scale << 14)),
    ...u16le(height | (scale << 14)),
  ]);
export const lossless = (width: number, height: number) =>
  riff([...text("VP8L"), ...u32le(5), 0x2f, ...u32le(width - 1 + ((height - 1) << 14))]);
export const extended = (width: number, height: number) =>
  riff([...text("VP8X"), ...u32le(10), 0x10, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]);

// Solid blue, 300 by 20, as ffmpeg encodes them.
export const FFMPEG_JPEG = fromBase64(
  "/9j/4AAQSkZJRgABAgAAAQABAAD//gAPTGF2YzYzLjEuMTAxAP/bAEMACAQEBAQEBQUFBQUFBgYGBgYGBgYGBgYGBgcHBwgICAcHBwYGBwcICAgICQkJCAgICAkJCgoKDAwLCw4ODhERFP/EAEwAAQEAAAAAAAAAAAAAAAAAAAAFAQEBAAAAAAAAAAAAAAAAAAAABhABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIABQBLAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AIIC7TgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//Z",
);
export const FFMPEG_LOSSY = fromBase64(
  "UklGRlwAAABXRUJQVlA4IFAAAAAQBQCdASosARQAPpFIoUylpCMiIOgAsBIJaQB2AAAQ9m+nTp06dOnTp06dOnTp03wAAP7paR//8bx4FeS7K///G83mtXcWPbIQAzUQCAAAAA==",
);
export const FFMPEG_LOSSLESS = fromBase64(
  "UklGRiQAAABXRUJQVlA4TBcAAAAvK8EEAAdQs8p0uf8BICH8ny9F9D+1BwA=",
);
export const FFMPEG_WITH_ALPHA = fromBase64(
  "UklGRoYAAABXRUJQVlA4WAoAAAAQAAAAKwEAEwAAQUxQSBAAAAABB9C/iAgACeH/fCmi/6k9VlA4IFAAAAAQBQCdASosARQAPpFIoUylpCMiIOgAsBIJaQB2AAAQ9m+nTp06dOnTp06dOnTp03wAAP7paR//8bx4FeS7K///G83mtXcWPbIQAzUQCAAAAA==",
);
// The common 1 by 1 transparent GIF.
export const ONE_PIXEL_GIF = fromBase64("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
