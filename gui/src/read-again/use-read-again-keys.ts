import { useContext, useEffect, useEffectEvent } from "react";

import { BackClosersContext } from "../navigation/back-closers";

const isRefresh = (event: KeyboardEvent): boolean =>
  event.key === "F5" ||
  ((event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "r");

/** F5, Ctrl+R or ⌘R read again, as a browser's refresh does, unless a dialog is open. */
export function useReadAgainKeys(active: boolean, onRead: () => void): void {
  const closers = useContext(BackClosersContext);
  const read = useEffectEvent(onRead);
  useEffect(() => {
    if (!active) {
      return;
    }
    const pressed = (event: KeyboardEvent) => {
      if (!isRefresh(event)) {
        return;
      }
      // Never the window's own reload, which would drop the page shown.
      event.preventDefault();
      if (!event.repeat && !closers.isOpen()) {
        read();
      }
    };
    window.addEventListener("keydown", pressed);
    return () => window.removeEventListener("keydown", pressed);
  }, [active, closers]);
}
