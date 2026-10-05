import type { MessageKey } from "@abth/i18n";
import { useCallback, useRef, useState } from "react";

import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { HirobaSessionPort } from "../session-port";
import {
  forgetPickable,
  keepPickable,
  loadPickable,
  offeredOf,
  type PickableState,
} from "./pickable-songs";

export interface PickableReading {
  readonly pickable: PickableState;
  /** Reads again, unless a read runs: each read of my page asks. The list held still serves. */
  refresh(): void;
  /** Reads when no read since the last of my page has brought a list, and none runs. */
  readIfStale(): void;
  /** Drops the list, the kept copy too, as another player may sign in next. */
  forget(): void;
}

export function usePickableSongs(
  port: Pick<HirobaSessionPort, "readSongPicker">,
  onSessionGone: (notice: MessageKey) => void,
): PickableReading {
  const [pickable, setPickable] = useState<PickableState>(() => ({
    offered: loadPickable(),
    status: { kind: "stale" },
  }));
  const latest = useRef(0);
  const reading = useRef(false);
  const stale = useRef(true);

  const refresh = useCallback(() => {
    if (reading.current) {
      return;
    }
    reading.current = true;
    const run = ++latest.current;
    setPickable((now) => ({ ...now, status: { kind: "reading" } }));
    void port.readSongPicker().then((result) => {
      if (run !== latest.current) {
        return;
      }
      reading.current = false;
      stale.current = !result.ok;
      if (result.ok) {
        keepPickable(result.value);
        setPickable({ offered: offeredOf(result.value), status: { kind: "current" } });
      } else if (SESSION_GONE.has(result.error.kind)) {
        onSessionGone(FAILURE_MESSAGE[result.error.kind]);
      } else {
        setPickable((now) => ({ ...now, status: { kind: "failed", failure: result.error } }));
      }
    });
  }, [port, onSessionGone]);

  const readIfStale = useCallback(() => {
    if (stale.current) {
      refresh();
    }
  }, [refresh]);

  const forget = useCallback(() => {
    latest.current += 1;
    reading.current = false;
    stale.current = true;
    forgetPickable();
    setPickable({ offered: null, status: { kind: "stale" } });
  }, []);

  return { pickable, refresh, readIfStale, forget };
}
