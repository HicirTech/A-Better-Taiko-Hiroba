import type { MessageKey } from "@abth/i18n";
import { useCallback, useMemo, useRef, useState } from "react";

import { hirobaSession } from "../shared/read-failure-message";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort, ReadFailure } from "../shared/session-port";
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
  const [reads, status] = useReadRun<ReadFailure>(hirobaSession(onSessionGone));
  // Stale until a read brings the list: as `staleShown`, for the callbacks that must not change.
  const stale = useRef(true);
  const [staleShown, setStaleShown] = useState(true);
  const putStale = useCallback((next: boolean) => {
    stale.current = next;
    setStaleShown(next);
  }, []);

  const refresh = useCallback(() => {
    void reads.run(() => port.readSongPicker(), {
      keep: (result) => {
        putStale(!result.ok);
        if (result.ok) {
          keepPickable(result.value);
          setOffered(offeredOf(result.value));
        }
      },
    });
  }, [reads, port, putStale]);

  const readIfStale = useCallback(() => {
    if (stale.current) {
      refresh();
    }
  }, [refresh]);

  const markStale = useCallback(() => putStale(true), [putStale]);

  const forget = useCallback(() => {
    reads.forget();
    putStale(true);
    forgetPickable();
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
  return { pickable, status, refresh, readIfStale, markStale, forget };
}
