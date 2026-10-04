import { useContext } from "react";

import { pointOf } from "../read-again/pull-gesture";
import { BackClosersContext } from "./back-closers";
import { swipeStarted } from "./swipe-gesture";
import { inTextField, useSwipe } from "./use-swipe";

export interface MenuSwipeProps {
  /** Whether the screen is touch-first: only there does a swipe open or close the menu. */
  readonly active: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function useMenuSwipe({ active, open, onOpenChange }: MenuSwipeProps): void {
  const closers = useContext(BackClosersContext);
  useSwipe({
    active,
    begin: (event) => {
      const finger = event.touches[0];
      return finger === undefined
        ? null
        : swipeStarted(pointOf(finger), {
            fingers: event.touches.length,
            menuOpen: open,
            windowWidthPx: window.innerWidth,
            claimed: closers.isOpen() || inTextField(event.target),
          });
    },
    onReached: (swipe) => onOpenChange(swipe.direction === "right"),
  });
}
