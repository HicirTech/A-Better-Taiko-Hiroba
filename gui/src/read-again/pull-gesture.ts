export interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

export const PULL_THRESHOLD_PX = 64;
export const PULL_LIMIT_PX = 128;
export const PULL_RESISTANCE = 0.5;
// Under the browser's own slop, so a pull is decided before the browser starts to scroll.
export const PULL_SLOP_PX = 8;

/** `idle` is no touch, or one that is not a pull and will not become one. */
export type PullState =
  | { readonly phase: "idle" }
  | { readonly phase: "undecided"; readonly start: TouchPoint }
  | { readonly phase: "pulling"; readonly start: TouchPoint; readonly distancePx: number };

export const NO_PULL: PullState = { phase: "idle" };

export interface PullContext {
  /** Fingers on the screen: two or more are a zoom, never a pull. */
  readonly fingers: number;
  readonly scrollTopPx: number;
  readonly enabled: boolean;
}

export function pullStarted(at: TouchPoint, context: PullContext): PullState {
  if (!context.enabled || context.fingers !== 1 || context.scrollTopPx > 0) {
    return NO_PULL;
  }

  return { phase: "undecided", start: at };
}

export function pullMoved(state: PullState, at: TouchPoint, scrollTopPx: number): PullState {
  if (state.phase === "idle" || scrollTopPx > 0) {
    return NO_PULL;
  }

  const down = at.y - state.start.y;
  if (state.phase === "pulling") {
    return { ...state, distancePx: pulledDistance(down) };
  }

  if (!movedPastSlop(state.start, at)) {
    return state;
  }

  if (down <= Math.abs(at.x - state.start.x)) {
    return NO_PULL;
  }

  return { phase: "pulling", start: state.start, distancePx: pulledDistance(down) };
}

export function movedPastSlop(start: TouchPoint, at: TouchPoint): boolean {
  return Math.max(Math.abs(at.x - start.x), Math.abs(at.y - start.y)) >= PULL_SLOP_PX;
}

export function pointOf(finger: {
  readonly clientX: number;
  readonly clientY: number;
}): TouchPoint {
  return { x: finger.clientX, y: finger.clientY };
}

export function pullReleased(state: PullState): boolean {
  return state.phase === "pulling" && state.distancePx >= PULL_THRESHOLD_PX;
}

function pulledDistance(downPx: number): number {
  return Math.min(PULL_LIMIT_PX, Math.max(0, downPx * PULL_RESISTANCE));
}
