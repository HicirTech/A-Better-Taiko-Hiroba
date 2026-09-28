/**
 * Pull-to-read on a touch-first screen, as rules on where a finger went: a touch that starts with
 * the page at its top and moves down, more down than sideways, pulls; a release far enough down
 * reads again. Anything else is the page's own scroll. Lengths are CSS pixels of the window.
 */

/** Where a finger is on the window. */
export interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

/** How far the indicator must be pulled down before a release reads again. */
export const PULL_THRESHOLD_PX = 64;
/** The farthest the indicator follows the finger down. */
export const PULL_LIMIT_PX = 128;
/** The indicator moves this share of the finger's travel, so the pull feels held back. */
export const PULL_RESISTANCE = 0.5;
/**
 * How far a finger may wander before its direction says what the touch is: under the browser's
 * own slop, so a pull is decided before the browser starts to scroll.
 */
export const PULL_SLOP_PX = 8;

/**
 * A touch as the gesture sees it: none, or one that is not a pull and will not become one;
 * one still too short to say; or a pull, with how far down it has drawn the indicator.
 */
export type PullState =
  | { readonly phase: "idle" }
  | { readonly phase: "undecided"; readonly start: TouchPoint }
  | { readonly phase: "pulling"; readonly start: TouchPoint; readonly distancePx: number };

export const NO_PULL: PullState = { phase: "idle" };

/** What else decides whether a touch may pull, beside where the finger is. */
export interface PullContext {
  /** Fingers on the screen: two or more are a zoom, never a pull. */
  readonly fingers: number;
  /** How far the page is scrolled down: a pull starts only at its top. */
  readonly scrollTopPx: number;
  /** Whether a read may start now: none running, and no write open or running. */
  readonly enabled: boolean;
}

/** A finger lands: only one finger, on a page at its top, while a read may start, can pull. */
export function pullStarted(at: TouchPoint, context: PullContext): PullState {
  if (!context.enabled || context.fingers !== 1 || context.scrollTopPx > 0) {
    return NO_PULL;
  }

  return { phase: "undecided", start: at };
}

/**
 * The finger moved. Down and more down than sideways, past the slop, it pulls; up or sideways, the
 * touch is the page's to scroll. A pull follows the finger, held back and stopped at the limit, and
 * back above where it started it rests at nothing. A page that scrolled under it ends it.
 */
export function pullMoved(state: PullState, at: TouchPoint, scrollTopPx: number): PullState {
  if (state.phase === "idle" || scrollTopPx > 0) {
    return NO_PULL;
  }

  const down = at.y - state.start.y;
  if (state.phase === "pulling") {
    return { ...state, distancePx: pulledDistance(down) };
  }

  const sideways = Math.abs(at.x - state.start.x);
  if (Math.max(Math.abs(down), sideways) < PULL_SLOP_PX) {
    return state;
  }

  if (down <= sideways) {
    return NO_PULL;
  }

  return { phase: "pulling", start: state.start, distancePx: pulledDistance(down) };
}

/** The finger lifted: whether the pull drew the indicator far enough to read again. */
export function pullReleased(state: PullState): boolean {
  return state.phase === "pulling" && state.distancePx >= PULL_THRESHOLD_PX;
}

/** How far the indicator is drawn by a finger `downPx` below where it landed. */
function pulledDistance(downPx: number): number {
  return Math.min(PULL_LIMIT_PX, Math.max(0, downPx * PULL_RESISTANCE));
}
