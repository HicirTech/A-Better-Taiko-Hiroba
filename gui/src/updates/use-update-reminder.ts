import { useCallback, useEffect, useRef, useState } from "react";

import type { HirobaSessionPort } from "../session-port";
import { automaticUpdateOffer, manualUpdateCheck } from "./update-checks";
import type { UpdateFeed } from "./update-feed";

/** The release the dialog tells of. It stays after it closes, so its notes last through the fade. */
export interface UpdateOffer {
  readonly feed: UpdateFeed;
  readonly open: boolean;
}

/** Where the check the player asked for stands; a newer version opens the dialog instead. */
export type ManualCheck = "idle" | "checking" | "upToDate" | "failed";

export interface UpdateReminder {
  readonly offer: UpdateOffer | null;
  /** Closes the dialog. */
  readonly later: () => void;
  readonly manual: ManualCheck;
  /** Starts the check the player asked for. */
  readonly checkNow: () => void;
}

// A frame is painted before the timeout runs, so the check starts after the first screen shows.
const afterFirstPaint = (run: () => void) => requestAnimationFrame(() => setTimeout(run, 0));

/** Checks for a newer version once at launch and when asked, and tells of it in a dialog. */
export function useUpdateReminder(
  port: Pick<HirobaSessionPort, "readUpdateFeed">,
  current: string,
): UpdateReminder {
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  const [manual, setManual] = useState<ManualCheck>("idle");
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
  const checkNow = useCallback(() => {
    setManual("checking");
    void manualUpdateCheck(() => port.readUpdateFeed(), current).then((found) => {
      if (found.kind === "newer") {
        setOffer({ feed: found.feed, open: true });
        setManual("idle");
      } else {
        setManual(found.kind);
      }
    });
  }, [port, current]);
  return { offer, later, manual, checkNow };
}
