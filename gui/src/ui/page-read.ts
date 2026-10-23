import { keyframes } from "@emotion/react";
import { useEffect, useState } from "react";

import { FADE_MS, moveWindow } from "../navigation/window-move";

/** How long a read may run before its page shows a skeleton: a quicker one shows none. */
export const SKELETON_AFTER_MS = 400;

const FADE_IN = keyframes`from { opacity: 0; }`;

/** A page that came after a wait fades in. */
export const FADES_IN = {
  animation: `${FADE_IN} ${FADE_MS}ms ease-out`,
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

/** What a page shows while it is read, and as the read ends. */
export interface PageRead {
  /** The page's skeleton stands in for it: the read has run a while, or its page takes over. */
  readonly skeleton: boolean;
  /** The page has just come after a short wait with nothing on screen, and fades in. */
  readonly fades: boolean;
}

interface Seen {
  readonly place: string;
  readonly waited: boolean;
  /** The page stayed on screen through the wait, so it does not fade in after it. */
  readonly held: boolean;
  readonly long: boolean;
}

/** A read of the page at `place`: nothing or the page held for a moment, its skeleton, the page. */
export function usePageRead(waiting: boolean, place: string, holds: boolean): PageRead {
  const [seen, setSeen] = useState<Seen>({ place, waited: waiting, held: holds, long: false });
  if (seen.place !== place) {
    // A page moved to while it waits slides in with its skeleton.
    setSeen({ place, waited: waiting, held: false, long: waiting });
  } else if (waiting && !seen.waited) {
    setSeen({ ...seen, waited: true, held: holds });
  }
  const { long } = seen;
  useEffect(() => {
    if (waiting) {
      const shapes = setTimeout(
        () => setSeen((now) => ({ ...now, long: true })),
        SKELETON_AFTER_MS,
      );
      return () => clearTimeout(shapes);
    }
    if (long) {
      // The skeleton fades out as the page fades in, in one move of the window.
      moveWindow("reveal", () =>
        setSeen((now) =>
          now.place === place ? { place, waited: false, held: false, long: false } : now,
        ),
      );
      return;
    }
    // Faded in, the page is shown as any other.
    const shown = setTimeout(() => setSeen((now) => ({ ...now, waited: false })), FADE_MS);
    return () => clearTimeout(shown);
  }, [waiting, long, place]);
  return { skeleton: long, fades: !waiting && !long && seen.waited && !seen.held };
}
