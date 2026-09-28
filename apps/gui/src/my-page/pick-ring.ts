/**
 * The ring around one of the costume editor's tiles, a swatch or an item, drawn outside the tile so
 * it never covers the colour or the picture. A solid ring in the primary colour marks the choice. A
 * dashed ring marks the tile the keyboard is on, which ButtonBase does not show by itself: in
 * `focusColor` on a tile not chosen, and in the choice's own colour and weight on the chosen one.
 * So focus and choice never look alike, and both show when they meet.
 */
export function pickRing(chosen: boolean, focusColor: string) {
  return {
    outline: chosen ? "3px solid" : "none",
    outlineColor: "primary.main",
    outlineOffset: "2px",
    "&.Mui-focusVisible": chosen
      ? { outlineStyle: "dashed" }
      : { outline: "2px dashed", outlineColor: focusColor },
  };
}
