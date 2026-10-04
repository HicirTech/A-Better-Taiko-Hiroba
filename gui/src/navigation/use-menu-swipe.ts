import { useContext, useEffect, useEffectEvent } from "react";

import { pointOf } from "../read-again/pull-gesture";
import { BackClosersContext } from "./back-closers";
import { type Swipe, swipeReached, swipeStarted } from "./swipe-gesture";

const TEXT_FIELDS = "input, textarea";

export interface MenuSwipeProps {
  /** Whether the screen is touch-first: only there does a swipe open or close the menu. */
  readonly active: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function useMenuSwipe({ active, open, onOpenChange }: MenuSwipeProps): void {
  const closers = useContext(BackClosersContext);
  const begin = useEffectEvent((event: TouchEvent) => {
    const finger = event.touches[0];
    return finger === undefined
      ? null
      : swipeStarted(pointOf(finger), {
          fingers: event.touches.length,
          menuOpen: open,
          windowWidthPx: window.innerWidth,
          claimed: closers.isOpen() || inTextField(event.target),
        });
  });
  const change = useEffectEvent(onOpenChange);
  useEffect(() => {
    if (!active) {
      return;
    }
    let swipe: Swipe | null = null;
    const start = (event: TouchEvent) => {
      swipe = begin(event);
    };
    const move = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (swipe === null || finger === undefined || !swipeReached(swipe, pointOf(finger))) {
        return;
      }
      change(swipe.direction === "right");
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

function inTextField(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_FIELDS) !== null;
}
