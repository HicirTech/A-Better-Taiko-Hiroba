/** A snapshot's width, the same from a phone or a computer. */
export const SNAPSHOT_WIDTH_PX = 1080;
/** Pixels to each CSS pixel: one, as chat apps such as WeChat shrink a picture to 1080 anyway. */
export const SNAPSHOT_PIXEL_RATIO = 1;

/** Its file's name: what it shows and when to the second, `abth-rating-2026-10-26-235930.png`. */
export function snapshotName(shows: string, made: Date): string {
  const twoDigits = (part: number) => String(part).padStart(2, "0");
  const day = [made.getFullYear(), made.getMonth() + 1, made.getDate()].map(twoDigits).join("-");
  const time = [made.getHours(), made.getMinutes(), made.getSeconds()].map(twoDigits).join("");
  return `${shows}-${day}-${time}.png`;
}
