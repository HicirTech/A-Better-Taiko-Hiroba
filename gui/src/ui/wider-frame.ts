import { createContext, useContext, useLayoutEffect } from "react";

/** How a page asks the frame for the wider width; outside the frame it asks for nothing. */
export const WiderFrameContext = createContext<(wider: boolean) => void>(() => undefined);

/** The frame is the wider one while `wider` holds. */
export function useWiderFrame(wider: boolean): void {
  const setWider = useContext(WiderFrameContext);
  // A layout effect, so the page is never painted in the narrower frame first.
  useLayoutEffect(() => {
    setWider(wider);
    return () => setWider(false);
  }, [setWider, wider]);
}
