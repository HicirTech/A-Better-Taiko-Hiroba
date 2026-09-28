/**
 * Hiroba's own geometry, kept at any width. Each of Hiroba's blocks is laid out in pixels of a
 * phone page: the header's plate 290 wide, the panel 280. The app draws each block as a size
 * container (`container-type: inline-size`) and gives every length in Hiroba's pixels of that
 * block, scaled to the container's width now, so the block keeps Hiroba's proportions, text over
 * pictures included, from a phone to a desktop window. Electron's Chromium and Android's WebView
 * both know container query units.
 */

/** What makes an element the container its children's Hiroba pixels are measured against. */
export const HIROBA_BLOCK = { containerType: "inline-size" } as const;

/**
 * Lengths in the pixels of Hiroba's block `width` wide: `hp(12)` is 12 of them, as a share of the
 * nearest container's width, `calc(12 * 100cqw / 290)` for the plate.
 */
export function hirobaPx(width: number): (pixels: number) => string {
  return (pixels) => `calc(${pixels} * 100cqw / ${width})`;
}

/**
 * Text kept for screen readers and for the page's text, but not drawn: what a picture shows, such
 * as the dan on its label, when the picture is drawn in its place. MUI's own visuallyHidden, which
 * the app does not depend on directly.
 */
export const VISUALLY_HIDDEN = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;
