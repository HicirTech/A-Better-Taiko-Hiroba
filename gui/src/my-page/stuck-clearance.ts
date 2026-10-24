import { BELOW_TOP_BAND, WHEN_TALL } from "../ui/frame-top";
import { publishHeightOf } from "../ui/publish-height";
import { SYNC_BAR_HEIGHT } from "../ui/sync-bar";
import { RING_ROOM_PX } from "./pick-ring";

const BLOCK_HEIGHT = "--stuck-block-height";

/** A ref for the block stuck at the top: it publishes its height. */
export const BLOCK_REF = publishHeightOf(BLOCK_HEIGHT);

/** Keeps what scrolls into view, a focused cell or a notice, clear of the band, block and bar. */
export const CLEAR_OF_STUCK = {
  scrollMarginTop: `calc(${BELOW_TOP_BAND} + ${RING_ROOM_PX}px)`,
  [WHEN_TALL]: {
    scrollMarginTop: `calc(${BELOW_TOP_BAND} + var(${BLOCK_HEIGHT}, 0px) + ${RING_ROOM_PX}px)`,
  },
  scrollMarginBottom: `calc(${SYNC_BAR_HEIGHT} + ${RING_ROOM_PX}px)`,
} as const;
