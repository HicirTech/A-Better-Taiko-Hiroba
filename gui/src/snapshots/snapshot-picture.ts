import type { PictureWay } from "../platform/system-share";

/** A snapshot's width, the same from a phone or a computer. */
export const SNAPSHOT_WIDTH_PX = 1080;
/** Pixels to each CSS pixel: one, as chat apps such as WeChat shrink a picture to 1080 anyway. */
export const SNAPSHOT_PIXEL_RATIO = 1;
// A file goes out as a WebP, which Discord and WeChat take; the clipboard holds a PNG alone.
// Either is encoded once, from the drawn card.
export const SNAPSHOT_TYPE: Readonly<Record<PictureWay, "image/png" | "image/webp">> = {
  copy: "image/png",
  save: "image/webp",
  share: "image/webp",
};
/** A WebP's quality: the chat apps compress it again, and the card's words show no loss. */
export const SNAPSHOT_WEBP_QUALITY = 0.9;

/** Its file's name: what it shows and when to the second, `abth-rating-2026-10-26-235930.webp`. */
export function snapshotName(shows: string, made: Date): string {
  const twoDigits = (part: number) => String(part).padStart(2, "0");
  const day = [made.getFullYear(), made.getMonth() + 1, made.getDate()].map(twoDigits).join("-");
  const time = [made.getHours(), made.getMinutes(), made.getSeconds()].map(twoDigits).join("");
  return `${shows}-${day}-${time}.webp`;
}
