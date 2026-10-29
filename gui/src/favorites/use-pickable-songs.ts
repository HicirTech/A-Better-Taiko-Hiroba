import type { Result } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useMemo, useRef, useState } from "react";

import { hirobaSession } from "../shared/read-failure-message";
import { type ReadStatus, readsIdle } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort, PickableSongs, ReadFailure } from "../shared/session-port";
import {
  forgetPickable,
  keepPickable,
  loadPickable,
  type OfferedSongs,
  offeredOf,
  type PickableState,
} from "./pickable-songs";

export interface PickableReading {
  readonly pickable: PickableState;
  /** Where the read of the list stands. */
  readonly status: ReadStatus<ReadFailure, never>;
  /** Reads again, unless a read runs: the picker's retry. The list held still serves. */
  refresh(): void;
  /** Reads when the list is stale and no read runs: as a picker opens. */
  readIfStale(): void;
  /** The list as Hiroba offers it now, read first unless a read brought it since the launch. */
  offeredNow(): Promise<OfferedSongs | null>;
  /** Leaves the list to be read again when a picker next opens. */
  markStale(): void;
  /** Drops the list, the kept copy too, as another player may sign in next. */
  forget(): void;
}

export function usePickableSongs(
  port: Pick<HirobaSessionPort, "readSongPicker">,
  onSessionGone: (notice: MessageKey) => void,
): PickableReading {
  const [offered, setOffered] = useState<OfferedSongs | null>(loadPickable);
  const latest = useRef(offered);
  const [reads, status] = useReadRun<ReadFailure>(hirobaSession(onSessionGone));
  // Stale until a read brings the list: as `staleShown`, for the callbacks that must not change.
  const stale = useRef(true);
  const [staleShown, setStaleShown] = useState(true);
  const putStale = useCallback((next: boolean) => {
    stale.current = next;
    setStaleShown(next);
  }, []);

  const keep = useCallback(
    (result: Result<PickableSongs, ReadFailure>) => {
      putStale(!result.ok);
      if (result.ok) {
        keepPickable(result.value);
        latest.current = offeredOf(result.value);
        setOffered(latest.current);
      }
    },
    [putStale],
  );
  const refresh = useCallback(() => {
    void reads.run(() => port.readSongPicker(), { keep });
  }, [reads, port, keep]);

  const readIfStale = useCallback(() => {
    if (stale.current) {
      refresh();
    }
  }, [refresh]);

  const offeredNow = useCallback(async () => {
    await readsIdle(reads);
    if (stale.current) {
      await reads.run(() => port.readSongPicker(), { keep });
    }
    return stale.current ? null : latest.current;
  }, [reads, port, keep]);

  const markStale = useCallback(() => putStale(true), [putStale]);

  const forget = useCallback(() => {
    reads.forget();
    putStale(true);
    forgetPickable();
    latest.current = null;
    setOffered(null);
  }, [reads, putStale]);

  const pickable = useMemo<PickableState>(
    () => ({
      offered,
      status:
        status.phase === "reading"
          ? { kind: "reading" }
          : status.failure !== null
            ? { kind: "failed", failure: status.failure }
            : { kind: staleShown ? "stale" : "current" },
    }),
    [offered, status, staleShown],
  );
  return { pickable, status, refresh, readIfStale, offeredNow, markStale, forget };
}
