/** An alpha this high counts as drawn; a fainter glow does not. */
const SEEN_ALPHA = 64;

/** RGBA bytes, row by row, as a canvas or a PNG decoder gives them. */
export interface Pixels {
  readonly data: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

/** The first row, from the top, with a pixel drawn between the columns `from` and `to` (fractions
 * of the width); the height when there is none. */
export function firstDrawnRow(pixels: Pixels, from: number, to: number): number {
  const left = Math.floor(from * pixels.width);
  const right = Math.ceil(to * pixels.width);
  for (let row = 0; row < pixels.height; row++) {
    for (let column = left; column < right; column++) {
      if ((pixels.data[(row * pixels.width + column) * 4 + 3] ?? 0) >= SEEN_ALPHA) {
        return row;
      }
    }
  }
  return pixels.height;
}
