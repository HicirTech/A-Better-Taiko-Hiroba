import { toBlob } from "html-to-image";

/** A snapshot's width, the same from a phone or a computer. */
export const SNAPSHOT_WIDTH_PX = 1080;
/** A snapshot's pixels to each of its CSS pixels: sharp on a phone's screen. */
export const SNAPSHOT_PIXEL_RATIO = 2;

/** `node` drawn as a PNG, `SNAPSHOT_PIXEL_RATIO` times its size, fonts and pictures in it. */
export async function pngOf(node: HTMLElement): Promise<Uint8Array> {
  const blob = await toBlob(node, { pixelRatio: SNAPSHOT_PIXEL_RATIO });
  if (blob === null) {
    throw new Error("snapshot=noBlob");
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** A snapshot's file name: what it shows and the day it was made, `abth-rating-2026-10-26.png`. */
export function snapshotName(shows: string, made: Date): string {
  const day = [made.getFullYear(), made.getMonth() + 1, made.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
  return `${shows}-${day}.png`;
}
