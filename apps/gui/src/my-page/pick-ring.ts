// Drawn outside the tile, never over it. A solid ring marks the choice; a dashed one the keyboard
// focus, which ButtonBase does not show itself, so the two never look alike and both show.
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
