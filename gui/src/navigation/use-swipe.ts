import { useEffect, useEffectEvent } from "react";

import { pointOf } from "../read-again/pull-gesture";
import { gesturesHeld } from "./gesture-hold";
import { type Swipe, swipeReached } from "./swipe-gesture";

const TEXT_FIELDS = "input, textarea";

export function inTextField(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_FIELDS) !== null;
}

export interface SwipeListening {
  /** Whether the screen is touch-first: only there does a swipe do anything. */
  readonly active: boolean;
  /** Decides, as a finger lands, whether the touch begins a swipe, and which. */
  readonly begin: (event: TouchEvent) => Swipe | null;
  /** The swipe went far and straight enough. */
  readonly onReached: (swipe: Swipe) => void;
}

export function useSwipe({ active, begin, onReached }: SwipeListening): void {
  const began = useEffectEvent(begin);
  const reached = useEffectEvent(onReached);
  useEffect(() => {
    if (!active) {
      return;
    }
    let swipe: Swipe | null = null;
    const start = (event: TouchEvent) => {
      swipe = began(event);
    };
    const move = (event: TouchEvent) => {
      if (gesturesHeld()) {
        swipe = null;
        return;
      }
      const finger = event.touches[0];
      if (swipe === null || finger === undefined || !swipeReached(swipe, pointOf(finger))) {
        return;
      }
      reached(swipe);
      swipe = null;
    };
    const end = () => {
      swipe = null;
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [active]);
}
