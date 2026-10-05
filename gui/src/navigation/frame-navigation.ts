import { createContext, useContext, useLayoutEffect } from "react";

/** How the app tells the frame whether to draw its navigation; outside the frame it tells nothing. */
export const FrameNavigationContext = createContext<(shown: boolean) => void>(() => undefined);

/** The frame draws its pages' list, and lets a swipe open it, only while `shown`. */
export function useFrameNavigation(shown: boolean): void {
  const setShown = useContext(FrameNavigationContext);
  // A layout effect, so the window is never painted with a navigation it should not have.
  useLayoutEffect(() => setShown(shown), [setShown, shown]);
}
