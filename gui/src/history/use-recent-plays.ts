import type { RecentPlay } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useRef, useState } from "react";

import { afterRefresh } from "../read-again/after-refresh";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { HirobaSessionPort, RecentPlaysFailure } from "../session-port";
import { useHeldCopy } from "../use-held-copy";

const POLL_MS = 200;

export interface RecentPlaysState {
  /** The stored walk, newest first; null until `load` has brought it. */
  readonly plays: readonly RecentPlay[] | null;
  readonly reading: boolean;
  readonly canRead: boolean;
  /** The page whose request has started, while a walk runs. */
  readonly page: number | null;
  readonly failure: RecentPlaysFailure | null;
  /** Brings the stored walk unless it is held: the page asks as it opens. */
  readonly load: () => void;
  /** The stored walk changed by another read, such as a read of the scores. */
  readonly markStale: () => void;
  /** Drops the walk held, for another player's session. */
  readonly forget: () => void;
  /** Walks the feed again, after Hiroba's own refresh. A second ask while one runs does nothing. */
  readonly read: () => Promise<void>;
}

/** The stored walk, and a read that reports the page it has reached. */
export function useRecentPlays(
  port: Pick<
    HirobaSessionPort,
    "refreshHiroba" | "recentPlays" | "readRecentPlays" | "recentPlaysProgress"
  >,
  onSessionGone: (notice: MessageKey) => void,
): RecentPlaysState {
  const kept = useHeldCopy(useCallback(() => port.recentPlays(), [port]));
  const { load: loadKept, hold } = kept;
  const [reading, setReading] = useState(false);
  const [page, setPage] = useState<number | null>(null);
  const [failure, setFailure] = useState<RecentPlaysFailure | null>(null);
  const running = useRef(false);
  const load = useCallback(() => {
    setFailure(null);
    loadKept();
  }, [loadKept]);
  const read = useCallback(async () => {
    if (running.current) {
      return;
    }
    running.current = true;
    setReading(true);
    setFailure(null);
    const poll = setInterval(() => {
      void port.recentPlaysProgress().then((current) => {
        if (current !== null && running.current) {
          setPage(current);
        }
      });
    }, POLL_MS);
    try {
      const result = await afterRefresh(port, () => port.readRecentPlays());
      if (result.ok) {
        hold(result.value.plays);
      } else if (SESSION_GONE.has(result.error.kind)) {
        onSessionGone(FAILURE_MESSAGE[result.error.kind]);
      } else {
        setFailure(result.error);
      }
    } finally {
      clearInterval(poll);
      running.current = false;
      setReading(false);
      setPage(null);
    }
  }, [port, onSessionGone, hold]);
  return {
    plays: kept.value,
    reading,
    canRead: !reading,
    page,
    failure,
    load,
    markStale: kept.markStale,
    forget: kept.forget,
    read,
  };
}
