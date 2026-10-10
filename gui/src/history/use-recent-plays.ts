import type { RecentPlay } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useRef, useState } from "react";

import { afterRefresh } from "../read-again/after-refresh";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { HirobaSessionPort, RecentPlaysFailure } from "../session-port";

const POLL_MS = 200;

export interface RecentPlaysState {
  /** The stored walk, newest first; null until `load` has brought it. */
  readonly plays: readonly RecentPlay[] | null;
  readonly reading: boolean;
  readonly canRead: boolean;
  /** The page whose request has started, while a walk runs. */
  readonly page: number | null;
  readonly failure: RecentPlaysFailure | null;
  /** Brings the stored walk: the page asks as it opens. */
  readonly load: () => void;
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
  const [plays, setPlays] = useState<readonly RecentPlay[] | null>(null);
  const [reading, setReading] = useState(false);
  const [page, setPage] = useState<number | null>(null);
  const [failure, setFailure] = useState<RecentPlaysFailure | null>(null);
  const running = useRef(false);
  const load = useCallback(() => {
    setPlays(null);
    setFailure(null);
    void port.recentPlays().then(setPlays);
  }, [port]);
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
        setPlays(result.value.plays);
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
  }, [port, onSessionGone]);
  return { plays, reading, canRead: !reading, page, failure, load, read };
}
