import { useCallback, useEffect, useRef, useState } from "react";

import type { HirobaSessionPort } from "../session-port";
import { automaticUpdateOffer } from "./update-checks";
import type { UpdateFeed } from "./update-feed";

/** The release the dialog tells of. It stays after it closes, so its notes last through the fade. */
export interface UpdateOffer {
  readonly feed: UpdateFeed;
  readonly open: boolean;
}

export interface UpdateReminder {
  readonly offer: UpdateOffer | null;
  /** Closes the dialog. */
  readonly later: () => void;
}

// A frame is painted before the timeout runs, so the check starts after the first screen shows.
const afterFirstPaint = (run: () => void) => requestAnimationFrame(() => setTimeout(run, 0));

/** Checks for a newer version once at launch, and tells of it in a dialog the window draws. */
export function useUpdateReminder(
  port: Pick<HirobaSessionPort, "readUpdateFeed">,
  current: string,
): UpdateReminder {
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  // Once only: StrictMode runs effects twice in development, and a second run checks again.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    afterFirstPaint(() => {
      void automaticUpdateOffer(() => port.readUpdateFeed(), current, Date.now()).then((feed) => {
        if (feed !== null) {
          setOffer({ feed, open: true });
        }
      });
    });
  }, [port, current]);
  const later = useCallback(
    () => setOffer((now) => (now === null ? null : { ...now, open: false })),
    [],
  );
  return { offer, later };
}
