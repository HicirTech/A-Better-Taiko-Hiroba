/** How long after the finger lifts the click it may make is still waited for. */
export const CLICK_AFTER_LIFT_MS = 500;
/** However long the finger stays down, the wait ends by then: nothing listens for ever. */
export const SWALLOW_MAX_MS = 60_000;

/** Timers that can be cleared: the page's own, or a test's. */
export interface SwallowTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
}

const PAGE_TIMERS: SwallowTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

/**
 * The window, which `globalThis` is in a browser, as the EventTarget it is: the tests and the
 * end-to-end script compile this module with no DOM library, which would not name `window`.
 */
const WINDOW = globalThis as unknown as EventTarget;

/** Whether an event is a click, or any event, made by a finger: a mouse and a key are not. */
function byFinger(event: Event): boolean {
  return (event as { pointerType?: string }).pointerType === "touch";
}

/**
 * Stops the one click a browser may make of the lift that ends the touch now in progress, wherever
 * it lands. It is for a touch whose press has acted already (a long-press, which took the window to
 * another page): the element the finger is on may be gone, so it hears nothing of the lift, cannot
 * stop the click there, and the click would land on whatever is under the finger on the page it
 * went to.
 *
 * A capture listener on `target` (the window) swallows the first click by a finger, and ends there.
 * It ends too when another touch begins, whose own click is not this one's, a moment after the
 * finger lifts with no click, or at the latest after SWALLOW_MAX_MS. A click by a mouse or a key is
 * never swallowed. Returns a function that ends it at once.
 */
export function swallowTouchClick(
  target: EventTarget = WINDOW,
  timers: SwallowTimers = PAGE_TIMERS,
): () => void {
  let ending: unknown = null;
  let over = false;
  const finish = () => {
    if (over) {
      return;
    }

    over = true;
    target.removeEventListener("click", onClick, true);
    target.removeEventListener("pointerdown", finish, true);
    target.removeEventListener("pointerup", lifted, true);
    target.removeEventListener("pointercancel", lifted, true);
    timers.clear(ending);
    timers.clear(giveUp);
  };
  const onClick = (event: Event) => {
    if (byFinger(event)) {
      event.preventDefault();
      event.stopPropagation();
      finish();
    }
  };
  const lifted = () => {
    timers.clear(ending);
    ending = timers.set(finish, CLICK_AFTER_LIFT_MS);
  };
  const giveUp = timers.set(finish, SWALLOW_MAX_MS);
  target.addEventListener("click", onClick, true);
  target.addEventListener("pointerdown", finish, true);
  target.addEventListener("pointerup", lifted, true);
  target.addEventListener("pointercancel", lifted, true);
  return finish;
}
