import { type RefObject, useCallback, useState } from "react";

import type { HirobaSessionPort, UndoSummaryOf, WriteKind } from "../session-port";

/**
 * The undo this device offers for the last write of `kind`, asked of the platform, never of Hiroba.
 * `session` counts the sessions the editor has been through: an answer that comes after the session
 * ended is dropped, so one player's undo is never offered to the next.
 */
export function useUndoOffer<K extends WriteKind>(
  port: HirobaSessionPort,
  kind: K,
  session: RefObject<number>,
) {
  const [undoable, setUndoable] = useState<UndoSummaryOf<K> | null>(null);

  /** Asks the platform for the undo on offer: after a write, and after a read that may settle one. */
  const refreshUndo = useCallback(async () => {
    const mine = session.current;
    const offered = await port.pendingUndo();
    if (mine === session.current) {
      // `kind` names the summary's own sets, so the one found is the kind's.
      setUndoable((offered.find((one) => one.kind === kind) ?? null) as UndoSummaryOf<K> | null);
    }
  }, [port, kind, session]);

  /** Offers none: the session is over. */
  const clearUndo = useCallback(() => setUndoable(null), []);

  return { undoable, refreshUndo, clearUndo };
}
