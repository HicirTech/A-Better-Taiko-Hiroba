import { keyframes } from "@emotion/react";
import { useEffect, useState } from "react";

/** How long a first read may run before its page shows a skeleton: a quicker one shows nothing. */
export const SKELETON_AFTER_MS = 400;
const FADE_MS = 200;

const FADE_IN = keyframes`from { opacity: 0; }`;

/** A page that came after a wait fades in. */
export const FADES_IN = {
  animation: `${FADE_IN} ${FADE_MS}ms ease-out`,
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

/** What a page shows while its first read runs, and as the read ends. */
export interface FirstRead {
  /** The read has run long enough to show the page's skeleton. */
  readonly skeleton: boolean;
  /** The page has just come after a wait, and fades in. */
  readonly fades: boolean;
}

interface Seen {
  readonly place: string;
  readonly waited: boolean;
  readonly long: boolean;
}

/** A first read of the page at `place`: nothing for a moment, then its skeleton, then the page. */
export function useFirstRead(waiting: boolean, place: string): FirstRead {
  const [seen, setSeen] = useState<Seen>({ place, waited: waiting, long: false });
  if (seen.place !== place) {
    // A page moved to while it waits slides in with its skeleton.
    setSeen({ place, waited: waiting, long: waiting });
  } else if (waiting && !seen.waited) {
    setSeen({ ...seen, waited: true });
  }
  useEffect(() => {
    if (waiting) {
      const long = setTimeout(() => setSeen((now) => ({ ...now, long: true })), SKELETON_AFTER_MS);
      return () => clearTimeout(long);
    }
    // Faded in, the page is shown as any other.
    const shown = setTimeout(
      () => setSeen((now) => ({ ...now, waited: false, long: false })),
      FADE_MS,
    );
    return () => clearTimeout(shown);
  }, [waiting]);
  return { skeleton: waiting && seen.long, fades: !waiting && seen.waited };
}
