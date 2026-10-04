const RING_WIDTH_PX = 3;
const RING_OFFSET_PX = 2;
/** How far the ring reaches outside its tile. */
export const RING_ROOM_PX = RING_WIDTH_PX + RING_OFFSET_PX;

// Drawn outside the tile, never over it. A solid ring marks the choice; a dashed one the keyboard
// focus, which ButtonBase does not show itself, so the two never look alike and both show.
export function pickRing(chosen: boolean, focusColor: string) {
  return {
    outline: chosen ? `${RING_WIDTH_PX}px solid` : "none",
    outlineColor: "primary.main",
    outlineOffset: `${RING_OFFSET_PX}px`,
    "&.Mui-focusVisible": chosen
      ? { outlineStyle: "dashed" }
      : { outline: "2px dashed", outlineColor: focusColor },
  };
}
