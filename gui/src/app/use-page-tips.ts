import { useEffect, useState } from "react";

import type { Page } from "../navigation/pages";
import type { PageData } from "../pages/page";
import { dueTips } from "../pages/page-tips";
import { keepSeenTips, keptSeenTips } from "../shared/tips/seen-tips";
import type { TipStep } from "../ui/tip-tour";

/** The page stands drawn this long before its tips start, so they point at it settled. */
const SETTLED_MS = 600;

export interface PageTips {
  readonly steps: readonly TipStep[];
  readonly onSeen: (ids: readonly string[]) => void;
}

/** The tips seen, as read once `page` was drawn and settled. */
interface SeenOn {
  readonly page: Page;
  readonly seen: ReadonlySet<string>;
}

/** The tips the page shown tells once it is drawn, and those gone past, kept on this device. */
export function usePageTips(page: Page, data: PageData, shown: boolean): PageTips {
  const { touchFirst, wide, pipelinesShown, i18n } = data;
  const [seenOn, setSeenOn] = useState<SeenOn | null>(null);
  const drawn = shown && !pipelinesShown;
  useEffect(() => {
    if (!drawn) {
      setSeenOn(null);
      return;
    }

    // Read as the tips start: what was kept since the window opened counts.
    const timer = window.setTimeout(() => setSeenOn({ page, seen: keptSeenTips() }), SETTLED_MS);
    return () => window.clearTimeout(timer);
  }, [drawn, page]);
  const steps =
    drawn && seenOn?.page === page
      ? dueTips(page, { touchFirst, wide }, seenOn.seen).map(({ id, at, words, scene }) => ({
          id,
          at,
          words: i18n.t(words),
          scene,
        }))
      : [];
  const onSeen = (ids: readonly string[]) => {
    const seen = new Set([...keptSeenTips(), ...ids]);
    keepSeenTips(seen);
    setSeenOn({ page, seen });
  };
  return { steps, onSeen };
}
