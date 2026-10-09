import { useContext } from "react";

import { pointOf } from "../read-again/pull-gesture";
import { BackClosersContext } from "./back-closers";
import { pipelinesSwipeStarted, type SwipeDirection } from "./swipe-gesture";
import { inTextField, useSwipe } from "./use-swipe";

export interface PipelinesSwipeProps {
  /** Whether the screen is touch-first and has a pipelines page to go to. */
  readonly active: boolean;
  /** The pages' list is in view: the menu is open, or a wide window's panel is there. */
  readonly pagesShown: boolean;
  readonly pipelinesShown: boolean;
  /** Where the pages' list ends, from the window's left edge: the swipe past it starts on it. */
  readonly listRightPx: number;
  /** Right to the pipelines page, left back to the menu. */
  readonly onSwiped: (direction: SwipeDirection) => void;
}

/** The swipe between the pages' list and the pipelines page, beside the menu's own. */
export function usePipelinesSwipe({
  active,
  pagesShown,
  pipelinesShown,
  listRightPx,
  onSwiped,
}: PipelinesSwipeProps): void {
  const closers = useContext(BackClosersContext);
  useSwipe({
    active,
    begin: (event) => {
      const finger = event.touches[0];
      return finger === undefined
        ? null
        : pipelinesSwipeStarted(pointOf(finger), {
            fingers: event.touches.length,
            pagesShown,
            pipelinesShown,
            listRightPx,
            claimed: closers.isOpen() || inTextField(event.target),
          });
    },
    onReached: (swipe) => onSwiped(swipe.direction),
  });
}
