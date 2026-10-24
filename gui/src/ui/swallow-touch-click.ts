export const CLICK_AFTER_LIFT_MS = 500;
export const SWALLOW_MAX_MS = 60_000;

export interface SwallowTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
}

const PAGE_TIMERS: SwallowTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

// The window as an EventTarget: tests and the end-to-end script compile this module without a DOM
// library, which would not name `window`.
const WINDOW = globalThis as unknown as EventTarget;

function byFinger(event: Event): boolean {
  return (event as { pointerType?: string }).pointerType === "touch";
}

// For a long-press that already acted: its element may be gone and cannot stop the lift's click,
// which would land on whatever is under the finger on the page it went to.
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
