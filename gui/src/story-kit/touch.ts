import type { TouchPoint } from "../read-again/pull-gesture";

const STEPS = 8;

/** A touch event of one finger at `at` on `target`, as a phone reports it. */
function sendTouch(target: Element, type: string, at: TouchPoint, touching: boolean): void {
  const finger = new Touch({ identifier: 1, target, clientX: at.x, clientY: at.y });
  target.dispatchEvent(
    new TouchEvent(type, {
      touches: touching ? [finger] : [],
      changedTouches: [finger],
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** A finger put on `target` at `from` and drawn to `to`; let go there only when `release`. */
export function touchDrag(
  target: Element,
  from: TouchPoint,
  to: TouchPoint,
  { release = false }: { readonly release?: boolean } = {},
): void {
  sendTouch(target, "touchstart", from, true);
  for (let step = 1; step <= STEPS; step++) {
    const at = {
      x: from.x + ((to.x - from.x) * step) / STEPS,
      y: from.y + ((to.y - from.y) * step) / STEPS,
    };
    sendTouch(target, "touchmove", at, true);
  }
  if (release) {
    sendTouch(target, "touchend", to, false);
  }
}

/** A finger held still in the middle of `target` for `ms`, then let go in place: a long press. */
export async function touchHold(target: Element, ms: number): Promise<void> {
  const box = target.getBoundingClientRect();
  const at = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  sendTouch(target, "touchstart", at, true);
  await new Promise((resolve) => setTimeout(resolve, ms));
  sendTouch(target, "touchend", at, false);
}
