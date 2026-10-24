import { useContext } from "react";

import { BackClosersContext } from "../ui/back-closers";
import { pointOf } from "../ui/pull-gesture";
import { inTextField, useSwipe } from "../ui/use-swipe";
import { setsSwipeStarted } from "./sets-swipe";

export interface SetsSwipeProps {
  /** Whether the screen is touch-first: only there does a swipe open or close the drawer. */
  readonly active: boolean;
  readonly open: boolean;
  /** The navigation's menu is open: its own swipe has the touch. */
  readonly menuOpen: boolean;
  /** The pipelines page lies over the page: its swipe has the touch. */
  readonly covered: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function useSetsSwipe({
  active,
  open,
  menuOpen,
  covered,
  onOpenChange,
}: SetsSwipeProps): void {
  const closers = useContext(BackClosersContext);
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
            claimed: menuOpen || covered || closers.isOpen() || inTextField(event.target),
          });
    },
    onReached: (swipe) => onOpenChange(swipe.direction === "left"),
  });
}
