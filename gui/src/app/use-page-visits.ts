import { useEffect, useEffectEvent } from "react";

import { PAGES, type Page } from "../navigation/pages";
import type { PageData } from "../pages/page";
import { PAGE_REGISTRY } from "../pages/registry";

/** A visit: what the page reads as it opens, its first read once due, and the edits it drops. */
export function usePageVisits(page: Page, data: PageData, settleMyPage: () => void): void {
  const profileShown = data.session.screen.name === "profile";
  // A page is drawn once it has something to show, and drawn anew after a skeleton, so what it
  // reads as it opens starts here, once a visit: read as it is drawn, a failure would read again.
  const open = useEffectEvent((opened: Page) => {
    for (const load of PAGE_REGISTRY[opened].opens?.(data) ?? []) {
      load();
    }
  });
  useEffect(() => {
    if (profileShown) {
      open(page);
    }
  }, [page, profileShown]);

  const due = profileShown ? (PAGE_REGISTRY[page].firstRead?.(data) ?? null) : null;
  useEffect(() => {
    void due?.();
  }, [due]);

  // Leaving a page drops the edits made on it; the editors keep what they read from Hiroba.
  // A failed read of my page is said on the page it failed on, until another opens.
  const leave = useEffectEvent((shown: Page) => {
    settleMyPage();
    for (const other of PAGES) {
      if (other !== shown) {
        for (const drop of PAGE_REGISTRY[other].leaves?.(data) ?? []) {
          drop();
        }
      }
    }
  });
  useEffect(() => {
    leave(page);
  }, [page]);
}
