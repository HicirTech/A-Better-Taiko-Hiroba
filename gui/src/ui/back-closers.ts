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
/** A page's modes that Back leaves, such as editing; unlike overlays, they hold back no gesture. */
export const BackModesContext = createContext<BackClosers>(createBackClosers());

function useStackedClose(stack: BackClosers, open: boolean, onClose: () => void): void {
  const close = useEffectEvent(onClose);
  useEffect(() => (open ? stack.add(() => close()) : undefined), [open, stack]);
}

/** While `open`, Android's Back calls `onClose` instead of leaving the page. */
export function useBackCloses(open: boolean, onClose: () => void): void {
  useStackedClose(useContext(BackClosersContext), open, onClose);
}

/** While `active`, Android's Back calls `onLeave` once no overlay or menu is open. */
export function useBackLeaves(active: boolean, onLeave: () => void): void {
  useStackedClose(useContext(BackModesContext), active, onLeave);
}
