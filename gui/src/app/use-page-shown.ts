import type { MessageKey } from "@abth/i18n";
import { useEffect } from "react";

import type { Page } from "../navigation/pages";
import type { PageData, PageEntry } from "../pages/page";
import { usePageRead } from "../ui/page-read";
import type { SkeletonProgress } from "../ui/page-skeleton";
import { pageWaiting } from "./page-waiting";

/** Where the page shown stands with its reads: shut, under its skeleton, or drawn. */
export interface PageShown {
  readonly waits: boolean;
  readonly skeleton: boolean;
  readonly fades: boolean;
  /** The page is drawn: read, or read again and held meanwhile. */
  readonly shown: boolean;
  /** My page could not be read, and no skeleton stands in the way of saying so. */
  readonly failed: boolean;
  /** What the skeleton says is read. */
  readonly label: MessageKey;
  readonly progress: SkeletonProgress | null;
}

/** The page's wait for its reads: shut at once, its skeleton after a moment, then the page. */
export function usePageShown(page: Page, entry: PageEntry, data: PageData): PageShown {
  const { screen, myPageInView } = data.session;
  const { waits, holds } = pageWaiting(
    screen.name,
    entry.standsAlone === true,
    entry.waits(data),
    entry.reading(data),
  );
  const read = usePageRead(waits, page, holds);
  // A skeleton is drawn from the top, so a page read again comes back at its top.
  useEffect(() => {
    if (read.skeleton) {
      window.scrollTo(0, 0);
    }
  }, [read.skeleton]);
  const myPageWaits = screen.name === "checking" || screen.name === "reading" || myPageInView;
  return {
    waits,
    skeleton: read.skeleton,
    fades: read.fades,
    // The skeleton stands alone until the page, or what came in its place, takes over from it.
    shown: screen.name === "profile" && !read.skeleton && (!waits || holds),
    failed: screen.name === "readFailed" && !read.skeleton,
    label: myPageWaits ? "profile.reading" : (entry.readLabel ?? entry.label),
    progress: entry.progress?.(data) ?? null,
  };
}
