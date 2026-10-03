import { createContext, useContext, useEffect, useEffectEvent } from "react";

/** The open overlays that take Android's Back; the one opened last closes first. */
export interface BackClosers {
  /** Adds an open overlay's closer; the function returned takes it away when the overlay shuts. */
  add(close: () => void): () => void;
  isOpen(): boolean;
  /** Closes the overlay opened last and no other. */
  closeLatest(): void;
}

export function createBackClosers(): BackClosers {
  const open: { readonly close: () => void }[] = [];
  return {
    add(close) {
      const entry = { close };
      open.push(entry);
      return () => {
        const at = open.indexOf(entry);
        if (at !== -1) {
          open.splice(at, 1);
        }
      };
    },
    isOpen: () => open.length > 0,
    closeLatest: () => open.at(-1)?.close(),
  };
}

export const BackClosersContext = createContext<BackClosers>(createBackClosers());

/** While `open`, Android's Back calls `onClose` instead of leaving the page. */
export function useBackCloses(open: boolean, onClose: () => void): void {
  const closers = useContext(BackClosersContext);
  const close = useEffectEvent(onClose);
  useEffect(() => (open ? closers.add(() => close()) : undefined), [open, closers]);
}
