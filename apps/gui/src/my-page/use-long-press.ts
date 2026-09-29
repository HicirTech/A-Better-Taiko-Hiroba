import { type TouchEvent, useCallback, useEffect, useRef } from "react";

import { movedPastSlop, pointOf, type TouchPoint } from "../read-again/pull-gesture";

/** How long a finger must stay still for a long-press: about Android's own. */
export const LONG_PRESS_MS = 500;

/** The touch handlers of an element a long-press acts on. */
export interface LongPressHandlers {
  readonly onTouchStart: (event: TouchEvent) => void;
  readonly onTouchMove: (event: TouchEvent) => void;
  readonly onTouchEnd: (event: TouchEvent) => void;
  readonly onTouchCancel: () => void;
}

/** A finger on the element: still waiting out the press, or held long enough, until it lifts. */
type Press =
  | {
      readonly phase: "waiting";
      readonly landed: TouchPoint;
      readonly timer: ReturnType<typeof setTimeout>;
    }
  | { readonly phase: "held" };

/**
 * A long-press on the element the handlers go on: one finger held still there for LONG_PRESS_MS
 * runs `onHeld`. A finger that wanders past the slop is a pull or a scroll (pull-gesture.ts), and a
 * second finger a zoom: either cancels it, as a lift before then does, and so does `enabled`
 * turning false while the finger is down. A tap stays a tap. The lift after a long-press sends no
 * click: the browser may make one of it, and it would land on whatever `onHeld` opened there.
 */
export function useLongPress(enabled: boolean, onHeld: () => void): LongPressHandlers {
  const press = useRef<Press | null>(null);
  const cancel = useCallback(() => {
    if (press.current?.phase === "waiting") {
      clearTimeout(press.current.timer);
    }
    press.current = null;
  }, []);
  useEffect(() => {
    if (!enabled) {
      cancel();
    }
  }, [enabled, cancel]);
  // And when the element goes, the finger still down.
  useEffect(() => cancel, [cancel]);
  return {
    onTouchStart: (event) => {
      cancel();
      const finger = event.touches[0];
      if (!enabled || event.touches.length !== 1 || finger === undefined) {
        return;
      }

      const timer = setTimeout(() => {
        press.current = { phase: "held" };
        onHeld();
      }, LONG_PRESS_MS);
      press.current = { phase: "waiting", landed: pointOf(finger), timer };
    },
    onTouchMove: (event) => {
      const finger = event.touches[0];
      if (press.current?.phase !== "waiting") {
        return;
      }

      if (
        event.touches.length !== 1 ||
        finger === undefined ||
        movedPastSlop(press.current.landed, pointOf(finger))
      ) {
        cancel();
      }
    },
    onTouchEnd: (event) => {
      if (press.current?.phase === "held") {
        event.preventDefault();
      }
      cancel();
    },
    onTouchCancel: cancel,
  };
}
