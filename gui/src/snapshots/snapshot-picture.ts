import type { PictureWay } from "../platform/system-share";

export type PictureType = "image/png" | "image/webp";

/** A snapshot's width, the same from a phone or a computer. */
export const SNAPSHOT_WIDTH_PX = 1080;
/** Rating's: four charts to a line under its head, about 4:3, as a chat app shrinks a tall one. */
export const RATING_SNAPSHOT_WIDTH_PX = 1824;
/** A gift's QR code in its picture: seven pixels a module at the longest, read once compressed. */
export const GIFT_CODE_PX = 560;
/** Pixels to each CSS pixel: one, as a chat app shrinks a picture to its view anyway. */
export const SNAPSHOT_PIXEL_RATIO = 1;
// A file goes out as a WebP, which Discord and WeChat take; the clipboard holds a PNG alone.
// Either is encoded once, from the drawn card.
export const SNAPSHOT_TYPE: Readonly<Record<PictureWay, PictureType>> = {
  copy: "image/png",
  save: "image/webp",
  share: "image/webp",
};
/** The type a way's picture is made in; a canvas that writes no WebP, as Safari's, gives a PNG. */
export const pictureTypeFor = (way: PictureWay, writesWebp: boolean): PictureType =>
  writesWebp ? SNAPSHOT_TYPE[way] : "image/png";
/** A WebP's quality: the chat apps compress it again, and the card's words show no loss. */
export const SNAPSHOT_WEBP_QUALITY = 0.9;

/** Its file's name: what it shows and when to the second, `abth-rating-2026-10-26-235930.webp`. */
export function snapshotName(shows: string, made: Date, type: PictureType = "image/webp"): string {
  const twoDigits = (part: number) => String(part).padStart(2, "0");
  const day = [made.getFullYear(), made.getMonth() + 1, made.getDate()].map(twoDigits).join("-");
  const time = [made.getHours(), made.getMinutes(), made.getSeconds()].map(twoDigits).join("");
  return `${shows}-${day}-${time}.${type === "image/webp" ? "webp" : "png"}`;
}
