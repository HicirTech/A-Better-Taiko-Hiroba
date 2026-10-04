import { useContext } from "react";

import { BackClosersContext } from "../navigation/back-closers";
import { MenuOpenContext } from "../navigation/menu-open";
import { inTextField, useSwipe } from "../navigation/use-swipe";
import { pointOf } from "../read-again/pull-gesture";
import { setsSwipeStarted } from "./sets-swipe";

export interface SetsSwipeProps {
  /** Whether the screen is touch-first: only there does a swipe open or close the drawer. */
  readonly active: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function useSetsSwipe({ active, open, onOpenChange }: SetsSwipeProps): void {
  const closers = useContext(BackClosersContext);
  const menuOpen = useContext(MenuOpenContext);
  useSwipe({
    active,
    begin: (event) => {
      const finger = event.touches[0];
      return finger === undefined
        ? null
        : setsSwipeStarted(pointOf(finger), {
            fingers: event.touches.length,
            drawerOpen: open,
            windowWidthPx: window.innerWidth,
            claimed: menuOpen || closers.isOpen() || inTextField(event.target),
          });
    },
    onReached: (swipe) => onOpenChange(swipe.direction === "left"),
  });
}
