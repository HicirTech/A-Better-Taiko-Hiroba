import type { RecentPlay, RecentPlaysReading, Result } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback } from "react";

import { afterRefresh } from "../read-again/after-refresh";
import { hirobaSession } from "../read-failure-message";
import type { ReadStatus } from "../reads/read-run";
import { useReadRun } from "../reads/use-read-run";
import type { HirobaSessionPort, RecentPlaysFailure } from "../session-port";
import { useHeldCopy } from "../use-held-copy";

export interface RecentPlaysState {
  /** The stored walk, newest first; null until `load` has brought it. */
  readonly plays: readonly RecentPlay[] | null;
  /** Where the walk stands, its progress the page whose request has started. */
  readonly status: ReadStatus<RecentPlaysFailure, number>;
  readonly reading: boolean;
  readonly canRead: boolean;
  /** The page whose request has started, while a walk runs. */
  readonly page: number | null;
  readonly failure: RecentPlaysFailure | null;
  /** Brings the stored walk unless it is held: the page asks as it opens. */
  readonly load: () => void;
  /** The stored walk changed by another read, such as a read of the scores. */
  readonly markStale: () => void;
  /** Drops the walk held, and one on its way, for another player's session. */
  readonly forget: () => void;
  /** Walks the feed again, after Hiroba's own refresh. A second ask while one runs does nothing. */
  readonly read: () => Promise<void>;
  /** As `read`, but walks every page past the plays stored, which the walk replaces: minutes. */
  readonly readEvery: () => Promise<void>;
}

/** The stored walk, and a read that reports the page it has reached. */
export function useRecentPlays(
  port: Pick<
    HirobaSessionPort,
    | "refreshHiroba"
    | "recentPlays"
    | "readRecentPlays"
    | "readEveryRecentPlay"
    | "recentPlaysProgress"
  >,
  onSessionGone: (notice: MessageKey) => void,
): RecentPlaysState {
  const kept = useHeldCopy(useCallback(() => port.recentPlays(), [port]));
  const { load: loadKept, hold, forget: forgetKept } = kept;
  const [walk, status] = useReadRun<RecentPlaysFailure, number>(hirobaSession(onSessionGone));
  const load = useCallback(() => {
    walk.settle();
    loadKept();
  }, [walk, loadKept]);
  const forget = useCallback(() => {
    walk.forget();
    forgetKept();
  }, [walk, forgetKept]);
  const walkWith = useCallback(
    async (ask: () => Promise<Result<RecentPlaysReading, RecentPlaysFailure>>) => {
      await walk.run(() => afterRefresh(port, ask), {
        progress: () => port.recentPlaysProgress(),
        keep: (result) => {
          if (result.ok) {
            hold(result.value.plays);
          }
        },
      });
    },
    [walk, port, hold],
  );
  const read = useCallback(() => walkWith(() => port.readRecentPlays()), [port, walkWith]);
  const readEvery = useCallback(() => walkWith(() => port.readEveryRecentPlay()), [port, walkWith]);
  return {
    plays: kept.value,
    status,
    reading: status.phase === "reading",
    canRead: status.phase !== "reading",
    page: status.progress,
    failure: status.failure,
    load,
    markStale: kept.markStale,
    forget,
    read,
    readEvery,
  };
}
