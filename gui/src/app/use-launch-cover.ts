import { useCallback, useEffect, useState } from "react";

import type { SystemLaunch } from "../platform";
import { coverGoesAt, coversReturn } from "./launch-cover-times";

/** A cover standing: since when, and since when the screen beneath is drawn. */
interface Standing {
  readonly shownAt: number;
  readonly drawnAt: number | null;
}

export interface LaunchCoverShown {
  readonly shown: boolean;
  /** The app's first screen is drawn: the cover goes once it has stood long enough. */
  readonly drawn: () => void;
}

/** The launch cover: from the window's start to its first screen, and again on a late return. */
export function useLaunchCover(launch: SystemLaunch | null): LaunchCoverShown {
  const [standing, setStanding] = useState<Standing | null>(() => ({
    shownAt: performance.now(),
    drawnAt: null,
  }));
  useEffect(() => {
    if (standing === null) {
      return;
    }
    const goesIn = coverGoesAt(standing.shownAt, standing.drawnAt) - performance.now();
    const gone = setTimeout(() => setStanding(null), goesIn);
    return () => clearTimeout(gone);
  }, [standing]);
  // The cover is drawn with the window, so the system's launch screen gives way to it.
  useEffect(() => launch?.covered(), [launch]);
  useEffect(
    () =>
      launch?.listenReturns((awayMs) => {
        if (coversReturn(awayMs)) {
          const now = performance.now();
          setStanding({ shownAt: now, drawnAt: now });
        }
      }),
    [launch],
  );
  const drawn = useCallback(
    () =>
      setStanding((now) =>
        now === null || now.drawnAt !== null ? now : { ...now, drawnAt: performance.now() },
      ),
    [],
  );
  return { shown: standing !== null, drawn };
}
