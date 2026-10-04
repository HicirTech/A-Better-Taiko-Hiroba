import { describe, expect, test } from "bun:test";

import { type SniffedPicture, sniffPicture } from "../src/song-catalogue/sniff-picture";
import {
  extended,
  FFMPEG_JPEG,
  FFMPEG_LOSSLESS,
  FFMPEG_LOSSY,
  FFMPEG_WITH_ALPHA,
  frame,
  gif,
  jpeg,
  lossless,
  lossy,
  ONE_PIXEL_GIF,
  png,
  riff,
  segment,
  text,
  u32le,
} from "./picture-fixtures";

const picture = (format: SniffedPicture["format"], width: number, height: number) => ({
  format,
  width,
  height,
});

describe("sniffPicture, what real encoders write", () => {
  test.each<[name: string, bytes: Uint8Array, expected: SniffedPicture]>([
    ["a PNG", png(300, 20), picture("png", 300, 20)],
    ["a tall PNG", png(20, 300), picture("png", 20, 300)],
    ["a JPEG", FFMPEG_JPEG, picture("jpeg", 300, 20)],
    ["a lossy WebP", FFMPEG_LOSSY, picture("webp", 300, 20)],
    ["a lossless WebP", FFMPEG_LOSSLESS, picture("webp", 300, 20)],
    ["a WebP with alpha", FFMPEG_WITH_ALPHA, picture("webp", 300, 20)],
    ["a GIF", ONE_PIXEL_GIF, picture("gif", 1, 1)],
  ])("reads %s", (_name, bytes, expected) => {
    expect(sniffPicture(bytes)).toEqual(expected);
  });

  const WHOLE = [
    ["a PNG", png(300, 20)],
    ["a JPEG", FFMPEG_JPEG],
    ["a lossy WebP", FFMPEG_LOSSY],
    ["a lossless WebP", FFMPEG_LOSSLESS],
    ["a WebP with alpha", FFMPEG_WITH_ALPHA],
    ["a GIF", gif(300, 20)],
  ] as const;

  test.each(WHOLE)("reads %s from a view into a larger buffer", (_name, bytes) => {
    const buffer = new Uint8Array(bytes.byteLength + 11).fill(0x41);
    buffer.set(bytes, 7);
    expect(sniffPicture(buffer.subarray(7, 7 + bytes.byteLength))).toEqual(sniffPicture(bytes));
  });

  test.each(WHOLE)(
    "never throws for %s cut short at any length, nor gives another size",
    (_name, bytes) => {
      const whole = sniffPicture(bytes);
      expect(whole).not.toBeNull();
      for (let length = 0; length < bytes.byteLength; length++) {
        expect([null, whole]).toContainEqual(sniffPicture(bytes.subarray(0, length)));
      }
    },
  );
});

describe("sniffPicture, a GIF", () => {
  test("reads both versions, with the sides low byte first", () => {
    expect(sniffPicture(gif(300, 20))).toEqual(picture("gif", 300, 20));
    expect(sniffPicture(gif(20, 65535, "GIF87a"))).toEqual(picture("gif", 20, 65535));
  });

  test("refuses another version, a side of zero, and a header cut short", () => {
    expect(sniffPicture(gif(300, 20, "GIF90a"))).toBeNull();
    expect(sniffPicture(gif(0, 20))).toBeNull();
    expect(sniffPicture(gif(300, 0))).toBeNull();
    expect(sniffPicture(gif(300, 20).subarray(0, 9))).toBeNull();
  });
});

describe("sniffPicture, a JPEG", () => {
  test("reads the size from the frame header, whichever kind of frame draws", () => {
    expect(sniffPicture(jpeg(frame(0xc0, 300, 20)))).toEqual(picture("jpeg", 300, 20));
    expect(sniffPicture(jpeg(frame(0xc1, 20, 300)))).toEqual(picture("jpeg", 20, 300));
    expect(sniffPicture(jpeg(frame(0xc2, 65535, 65535)))).toEqual(picture("jpeg", 65535, 65535));
  });

  test("skips the segments before the frame, an EXIF block among them", () => {
    const jfif = segment(0xe0, [...text("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
    const exif = segment(0xe1, [...text("Exif\0\0"), ...new Array(400).fill(0xff)]);
    const tables = segment(0xdb, new Array(65).fill(1));
    expect(sniffPicture(jpeg(jfif, exif, tables, frame(0xc0, 640, 480)))).toEqual(
      picture("jpeg", 640, 480),
    );
  });

  test("steps over fill bytes and markers that stand alone", () => {
    const parts = [[0xff], [0xff, 0x01], [0xff, 0xd0], frame(0xc0, 33, 44)];
    expect(sniffPicture(jpeg(...parts))).toEqual(picture("jpeg", 33, 44));
  });

  test("refuses a frame no browser draws, and a scan before any frame", () => {
    expect(sniffPicture(jpeg(frame(0xc3, 300, 20)))).toBeNull();
    expect(sniffPicture(jpeg(frame(0xc9, 300, 20)))).toBeNull();
    const scan = segment(0xda, [1, 1, 0, 0, 0x3f, 0]);
    expect(sniffPicture(jpeg(scan, frame(0xc0, 300, 20)))).toBeNull();
  });

  test("refuses a side of zero, and a frame cut short", () => {
    expect(sniffPicture(jpeg(frame(0xc0, 0, 20)))).toBeNull();
    expect(sniffPicture(jpeg(frame(0xc0, 300, 0)))).toBeNull();
    expect(sniffPicture(jpeg(frame(0xc0, 300, 20)).subarray(0, 10))).toBeNull();
  });

  test("goes no further past bytes that are no segment, or a segment longer than the file", () => {
    const stray = [0x12, 0x34, 0x56, 0x78];
    expect(sniffPicture(jpeg(segment(0xe0, [0, 0]), stray, frame(0xc0, 300, 20)))).toBeNull();
    const longer = [0xff, 0xe1, 0xff, 0xff, 1, 2, 3];
    expect(sniffPicture(jpeg(longer, frame(0xc0, 300, 20)))).toBeNull();
  });
});

describe("sniffPicture, a WebP", () => {
  test("reads each of the three kinds", () => {
    expect(sniffPicture(lossy(300, 20))).toEqual(picture("webp", 300, 20));
    expect(sniffPicture(lossless(300, 20))).toEqual(picture("webp", 300, 20));
    expect(sniffPicture(extended(300, 20))).toEqual(picture("webp", 300, 20));
  });

  test("reads the widest sides each kind holds", () => {
    expect(sniffPicture(lossy(16383, 16383))).toEqual(picture("webp", 16383, 16383));
    expect(sniffPicture(lossless(16384, 16384))).toEqual(picture("webp", 16384, 16384));
    expect(sniffPicture(extended(70000, 3))).toEqual(picture("webp", 70000, 3));
    expect(sniffPicture(extended(3, 16777216))).toEqual(picture("webp", 3, 16777216));
  });

  test("leaves out the scale a lossy picture's top bits hold", () => {
    expect(sniffPicture(lossy(300, 20, 3))).toEqual(picture("webp", 300, 20));
  });

  test("refuses a lossy picture with no key frame, and a lossless one with no signature", () => {
    const noStart = lossy(300, 20);
    noStart[23] = 0x00;
    expect(sniffPicture(noStart)).toBeNull();
    const noSignature = lossless(300, 20);
    noSignature[20] = 0x00;
    expect(sniffPicture(noSignature)).toBeNull();
  });

  test("refuses a side of zero, another chunk first, and a RIFF that holds no WebP", () => {
    expect(sniffPicture(lossy(0, 20))).toBeNull();
    const unknown = riff([...text("VP8Z"), ...u32le(10), ...new Array(10).fill(0)]);
    expect(sniffPicture(unknown)).toBeNull();
    const wave = extended(300, 20);
    wave.set(text("WAVE"), 8);
    expect(sniffPicture(wave)).toBeNull();
  });
});

describe("sniffPicture, what is no picture", () => {
  const emptyPng = png(300, 20);
  new DataView(emptyPng.buffer).setUint32(16, 0);
  const noHeader = Uint8Array.from([
    0x89,
    ...text("PNG\r\n"),
    0x1a,
    0x0a,
    ...new Array(40).fill(0),
  ]);

  test.each<[name: string, bytes: Uint8Array]>([
    ["nothing", new Uint8Array(0)],
    ["a page", new TextEncoder().encode("<!doctype html><title>Not found</title>")],
    ["a vector picture", new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"/>`)],
    ["a bitmap", Uint8Array.from([...text("BM"), ...new Array(60).fill(0)])],
    ["an icon", Uint8Array.from([0, 0, 1, 0, 1, 0, 16, 16, ...new Array(40).fill(0)])],
    ["bytes of one value", new Uint8Array(512).fill(0x47)],
    ["a PNG with no header chunk", noHeader],
    ["a PNG of no width", emptyPng],
    ["a PNG cut inside its header", png(300, 20).subarray(0, 20)],
  ])("refuses %s", (_name, bytes) => {
    expect(sniffPicture(bytes)).toBeNull();
  });
});
