import { OPENING_AREA_SHARE, type Swipe } from "../navigation/swipe-gesture";
import type { TouchPoint } from "../read-again/pull-gesture";

export interface SetsSwipeContext {
  /** Fingers on the screen: two or more are a zoom, never a swipe. */
  readonly fingers: number;
  readonly drawerOpen: boolean;
  readonly windowWidthPx: number;
  /** The touch belongs to the navigation menu, a dialog or a text field, so it opens nothing. */
  readonly claimed: boolean;
}

/** A swipe left from the right two thirds opens the sets drawer; a swipe right shuts it. */
export function setsSwipeStarted(at: TouchPoint, context: SetsSwipeContext): Swipe | null {
  if (context.fingers !== 1) {
    return null;
  }

  if (context.drawerOpen) {
    return { start: at, direction: "right" };
  }

  const fromRightPx = context.windowWidthPx - at.x;
  if (context.claimed || fromRightPx > context.windowWidthPx * OPENING_AREA_SHARE) {
    return null;
  }

  return { start: at, direction: "left" };
}
