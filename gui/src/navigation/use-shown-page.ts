import { useCallback, useRef, useState } from "react";
import { moveWindow } from "../ui/window-move";
import { pageMove } from "./page-move";
import type { Page } from "./pages";

const KEEP_NOTHING = () => {};

/** The page the window shows, and the way to another: a move there, and none to this one. */
export function useShownPage(
  first: () => Page,
  keep: (page: Page) => void = KEEP_NOTHING,
): readonly [Page, (next: Page) => void] {
  const [page, setPage] = useState(first);
  // The page last asked for: a second ask can come before the first move has set it.
  const asked = useRef(page);
  const navigate = useCallback(
    (next: Page) => {
      const move = pageMove(asked.current, next);
      // The page shown already: no move, no read and no scroll.
      if (move === null) {
        return;
      }
      asked.current = next;
      keep(next);
      moveWindow(move, () => {
        setPage(next);
        window.scrollTo(0, 0);
      });
    },
    [keep],
  );
  return [page, navigate];
}
