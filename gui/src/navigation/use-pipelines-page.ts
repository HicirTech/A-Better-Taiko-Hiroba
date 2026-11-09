import { useLayoutEffect, useRef, useState } from "react";

import { moveWindow } from "../ui/window-move";
import type { Page } from "./pages";

/** The pipelines page over a page: the page it lies over, the way there and back, and going on. */
export function usePipelinesPage({
  page,
  navigation,
  onNavigate,
  setMenuOpen,
}: {
  readonly page: Page;
  /** The navigation is drawn: none while signed out. */
  readonly navigation: boolean;
  readonly onNavigate: (page: Page) => void;
  readonly setMenuOpen: (open: boolean) => void;
}) {
  // The page the pipelines page was opened over, while it is shown.
  const [pipelinesOver, setPipelinesOver] = useState<Page | null>(null);
  // A sign-out takes the pipelines page with the menu, and going to another page takes it too.
  if (pipelinesOver !== null && (!navigation || pipelinesOver !== page)) {
    setPipelinesOver(null);
  }
  const pipelinesShown = pipelinesOver !== null;
  // The page under the pipelines page goes back to where it was scrolled.
  const pageScroll = useRef(0);
  useLayoutEffect(() => {
    if (!pipelinesShown) {
      window.scrollTo(0, pageScroll.current);
    }
  }, [pipelinesShown]);
  const showPipelines = (shown: boolean, menuAfter = false) => {
    if (shown) {
      pageScroll.current = window.scrollY;
    }
    moveWindow(shown ? "pipelinesIn" : "pipelinesOut", () => {
      if (shown) {
        window.scrollTo(0, 0);
      }
      setMenuOpen(menuAfter);
      setPipelinesOver(shown ? page : null);
    });
  };
  const navigate = (next: Page) => {
    // The page under the pipelines page: back to it as it was, as the arrow goes.
    if (pipelinesShown && next === page) {
      showPipelines(false);
      return;
    }
    pageScroll.current = 0;
    onNavigate(next);
  };
  return { pipelinesShown, showPipelines, navigate };
}
