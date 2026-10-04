import { BELOW_TOP_BAND, WHEN_TALL } from "../navigation/app-frame";
import { RING_ROOM_PX } from "./pick-ring";

const BLOCK_HEIGHT = "--stuck-block-height";
const BAR_HEIGHT = "--stuck-bar-height";

function publishHeightOf(property: string) {
  return (node: HTMLElement | null) => {
    if (node === null) {
      return;
    }

    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(property, `${node.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty(property);
    };
  };
}

/** Refs for the block stuck at the top and the bar at the bottom: each publishes its height. */
export const BLOCK_REF = publishHeightOf(BLOCK_HEIGHT);
export const BAR_REF = publishHeightOf(BAR_HEIGHT);

/** Keeps what scrolls into view, a focused cell or a notice, clear of the band, block and bar. */
export const CLEAR_OF_STUCK = {
  scrollMarginTop: `calc(${BELOW_TOP_BAND} + ${RING_ROOM_PX}px)`,
  [WHEN_TALL]: {
    scrollMarginTop: `calc(${BELOW_TOP_BAND} + var(${BLOCK_HEIGHT}, 0px) + ${RING_ROOM_PX}px)`,
  },
  scrollMarginBottom: `calc(var(${BAR_HEIGHT}, 0px) + ${RING_ROOM_PX}px)`,
} as const;
