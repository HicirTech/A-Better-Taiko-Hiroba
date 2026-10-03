import { type TouchEvent, useCallback, useEffect, useRef } from "react";

import { movedPastSlop, pointOf, type TouchPoint } from "../read-again/pull-gesture";
import { swallowTouchClick } from "./swallow-touch-click";

/** About Android's own long-press time. */
export const LONG_PRESS_MS = 500;

export interface LongPressHandlers {
  readonly onTouchStart: (event: TouchEvent) => void;
  readonly onTouchMove: (event: TouchEvent) => void;
  readonly onTouchEnd: (event: TouchEvent) => void;
  readonly onTouchCancel: () => void;
}

type Press =
  | {
      readonly phase: "waiting";
      readonly landed: TouchPoint;
      readonly timer: ReturnType<typeof setTimeout>;
    }
  | { readonly phase: "held" };

// The lift after a long-press must make no click, which would land on whatever onHeld opened: the
// element's touchend stops it, and swallowTouchClick covers an element onHeld has taken away.
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
  // Also cancel when the element goes while the finger is still down.
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
        swallowTouchClick();
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
