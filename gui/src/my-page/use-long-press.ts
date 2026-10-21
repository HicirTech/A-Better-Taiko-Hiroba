import { type TouchEvent, useCallback, useEffect, useRef, useState } from "react";

import { movedPastSlop, pointOf, type TouchPoint } from "../read-again/pull-gesture";
import { swallowTouchClick } from "./swallow-touch-click";

/** Every long press in the app, held still: long enough that a hurried tap never makes one. */
export const LONG_PRESS_MS = 700;

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
  | { readonly phase: "held"; readonly landed: TouchPoint };

interface PressEnds {
  /** The press has been held long enough. */
  readonly took: () => void;
  /** Given, the press acts only when the finger lifts in place once it took. */
  readonly letGo?: () => void;
  /** The press is over, whether it acted or not. */
  readonly over?: () => void;
}

// The lift after a long-press must make no click, which would land on whatever it opened: the
// element's touchend stops it, and swallowTouchClick covers an element the press has taken away.
function usePress(enabled: boolean, ends: PressEnds): LongPressHandlers {
  const press = useRef<Press | null>(null);
  const latest = useRef(ends);
  useEffect(() => {
    latest.current = ends;
  });
  const cancel = useCallback(() => {
    if (press.current === null) {
      return;
    }

    if (press.current.phase === "waiting") {
      clearTimeout(press.current.timer);
    }
    press.current = null;
    latest.current.over?.();
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

      const landed = pointOf(finger);
      const timer = setTimeout(() => {
        press.current = { phase: "held", landed };
        latest.current.took();
      }, LONG_PRESS_MS);
      press.current = { phase: "waiting", landed, timer };
    },
    onTouchMove: (event) => {
      const now = press.current;
      // One that acted as it took is done with the finger; one waiting to be let go is not.
      if (now === null || (now.phase === "held" && latest.current.letGo === undefined)) {
        return;
      }

      const finger = event.touches[0];
      if (
        event.touches.length !== 1 ||
        finger === undefined ||
        movedPastSlop(now.landed, pointOf(finger))
      ) {
        cancel();
      }
    },
    onTouchEnd: (event) => {
      const { letGo } = latest.current;
      if (press.current?.phase === "held") {
        event.preventDefault();
        if (letGo !== undefined) {
          swallowTouchClick();
          letGo();
        }
      }
      cancel();
    },
    onTouchCancel: cancel,
  };
}

/** A press held long enough acts as it takes, as the portrait opens the Costume page. */
export function useLongPress(enabled: boolean, onHeld: () => void): LongPressHandlers {
  return usePress(enabled, {
    took: () => {
      swallowTouchClick();
      onHeld();
    },
  });
}

/** A long press that acts when let go in place, as an item's menu; `held` once it took. */
export function useLongPressLetGo(
  enabled: boolean,
  onLetGo: () => void,
): { readonly handlers: LongPressHandlers; readonly held: boolean } {
  const [held, setHeld] = useState(false);
  const handlers = usePress(enabled, {
    took: () => setHeld(true),
    letGo: onLetGo,
    over: () => setHeld(false),
  });
  return { handlers, held };
}
