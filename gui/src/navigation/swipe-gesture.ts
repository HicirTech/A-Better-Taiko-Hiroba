import type { TouchPoint } from "../read-again/pull-gesture";

export const SWIPE_DISTANCE_PX = 56;
// Horizontal over vertical travel: a flatter drag is the page being scrolled.
export const SWIPE_STRAIGHTNESS = 2;
// Not the edge alone: Android's gesture navigation takes an edge swipe as Back.
export const OPENING_AREA_SHARE = 2 / 3;

/** The way the finger travels. */
export type SwipeDirection = "right" | "left";

export interface Swipe {
  readonly start: TouchPoint;
  readonly direction: SwipeDirection;
}

export interface SwipeContext {
  /** Fingers on the screen: two or more are a zoom, never a swipe. */
  readonly fingers: number;
  readonly menuOpen: boolean;
  readonly windowWidthPx: number;
  /** The touch belongs to a text field or to a dialog over the page, so it opens nothing. */
  readonly claimed: boolean;
}

export function swipeStarted(at: TouchPoint, context: SwipeContext): Swipe | null {
  if (context.fingers !== 1) {
    return null;
  }

  if (context.menuOpen) {
    return { start: at, direction: "left" };
  }

  if (context.claimed || at.x > context.windowWidthPx * OPENING_AREA_SHARE) {
    return null;
  }

  return { start: at, direction: "right" };
}

export function swipeReached({ start, direction }: Swipe, at: TouchPoint): boolean {
  const along = direction === "right" ? at.x - start.x : start.x - at.x;
  const across = Math.abs(at.y - start.y);
  return along >= SWIPE_DISTANCE_PX && along >= SWIPE_STRAIGHTNESS * across;
}

export interface PipelinesSwipeContext {
  readonly fingers: number;
  /** The pages' list is in view: the menu is open, or a wide window's panel is there. */
  readonly pagesShown: boolean;
  readonly pipelinesShown: boolean;
  /** Where the pages' list ends, from the window's left edge. */
  readonly listRightPx: number;
  readonly claimed: boolean;
}

/** One level past the pages' list: right from it to the pipelines page, left back from that. */
export function pipelinesSwipeStarted(
  at: TouchPoint,
  context: PipelinesSwipeContext,
): Swipe | null {
  if (context.fingers !== 1 || context.claimed) {
    return null;
  }

  if (context.pipelinesShown) {
    return { start: at, direction: "left" };
  }

  // On the list itself: the page beside a wide window's panel keeps its own swipes.
  return context.pagesShown && at.x <= context.listRightPx
    ? { start: at, direction: "right" }
    : null;
}
