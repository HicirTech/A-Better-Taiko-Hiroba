/** Makes an element the container its children's Hiroba pixels are measured against. */
export const HIROBA_BLOCK = { containerType: "inline-size" } as const;

export const MAX_BLOCK_SCALE = 1.5;

/** `hp(12)` is 12 pixels of a Hiroba block `width` wide, scaled to the container. */
export function hirobaPx(width: number): (pixels: number) => string {
  return (pixels) => `calc(${pixels} * 100cqw / ${width})`;
}

export const ONE_LINE = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

/** A text shadow outlining light words in a dark 1px line, as Hiroba draws some. */
export const OUTLINED = ["-1px -1px", "1px -1px", "-1px 1px", "1px 1px"]
  .map((offset) => `${offset} 0 #1a1a1a`)
  .join(", ");
