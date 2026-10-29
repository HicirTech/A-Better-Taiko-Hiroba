import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { type Gift, giftCode, scannedCodeOf } from "../src/shared/gifts/gift-code";
import { qrCodePath, qrTextIn } from "../src/shared/gifts/qr-codes";
import { GIFT_CODE_PX, SNAPSHOT_WIDTH_PX } from "../src/snapshots/snapshot-picture";

/** A gift at its limits: four songs, the longest nickname and title, all three bytes a letter. */
const GIFT: Gift = {
  songs: ["1178", "1001", "365", "1203"],
  giver: "ドンだーひろばの名人",
  title: "お誕生日おめでとう！今年もたくさん遊ぼう",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: false,
};

/** A gift's picture near enough as the app draws it: its code on a white card, saved as WebP. */
async function giftPicture(text: string, shift: number): Promise<Buffer> {
  const { size, path } = qrCodePath(text);
  const side = Math.floor(GIFT_CODE_PX / size) * size;
  const at = Math.round((SNAPSHOT_WIDTH_PX - side) / 2) + shift;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SNAPSHOT_WIDTH_PX}" height="${SNAPSHOT_WIDTH_PX}">`,
    `<rect width="100%" height="100%" fill="white"/>`,
    `<svg x="${at}" y="${at}" width="${side}" height="${side}" viewBox="0 0 ${size} ${size}">`,
    `<path d="${path}" fill="black" shape-rendering="crispEdges"/></svg>`,
    "</svg>",
  ].join("");
  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
}

/** The ways a chat app, or a photo of a screen, makes a picture worse. */
const COMPRESSIONS: readonly ((picture: Buffer) => Promise<Buffer>)[] = [
  async (picture) => picture,
  (picture) => sharp(picture).resize({ width: 720 }).jpeg({ quality: 70 }).toBuffer(),
  (picture) => sharp(picture).resize({ width: 540 }).jpeg({ quality: 50 }).toBuffer(),
  (picture) => sharp(picture).resize({ width: 360 }).jpeg({ quality: 40 }).toBuffer(),
  (picture) =>
    sharp(picture)
      .rotate(3, { background: "#888888" })
      .blur(0.8)
      .resize({ width: 650 })
      .jpeg({ quality: 60 })
      .toBuffer(),
];

async function readBack(picture: Buffer): Promise<string | null> {
  const { data, info } = await sharp(picture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return qrTextIn(new Uint8ClampedArray(data), info.width, info.height);
}

describe("a gift's QR code", () => {
  test("holds the longest gift in modules at least seven pixels wide", () => {
    expect(GIFT.giver.length).toBe(10);
    expect(GIFT.title.length).toBe(20);
    expect(qrCodePath(giftCode(GIFT)).size).toBeLessThanOrEqual(GIFT_CODE_PX / 7);
  });

  test("reads back after compression, wherever its modules fall on the pixels", async () => {
    for (let shift = 0; shift < 7; shift += 2) {
      const picture = await giftPicture(giftCode(GIFT), shift);
      for (const compress of COMPRESSIONS) {
        const text = await readBack(await compress(picture));
        expect(text === null ? null : scannedCodeOf(text)).toEqual({ kind: "gift", gift: GIFT });
      }
    }
  });

  test("reads nothing in a picture without a code", async () => {
    const blank = await sharp({
      create: { width: 200, height: 200, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    expect(await readBack(blank)).toBeNull();
  });
});
