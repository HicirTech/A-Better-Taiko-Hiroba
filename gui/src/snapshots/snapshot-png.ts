/** A snapshot's width, the same from a phone or a computer. */
export const SNAPSHOT_WIDTH_PX = 1080;
/** Pixels to each CSS pixel: one, as chat apps such as WeChat shrink a picture to 1080 anyway. */
export const SNAPSHOT_PIXEL_RATIO = 1;

/** A snapshot's file name: what it shows and the day it was made, `abth-rating-2026-10-26.png`. */
export function snapshotName(shows: string, made: Date): string {
  const day = [made.getFullYear(), made.getMonth() + 1, made.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
  return `${shows}-${day}.png`;
}
