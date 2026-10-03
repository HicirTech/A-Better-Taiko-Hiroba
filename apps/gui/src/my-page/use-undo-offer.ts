import { type RefObject, useCallback, useState } from "react";

import type { HirobaSessionPort, UndoSummaryOf, WriteKind } from "../session-port";

// Asked of the platform, never of Hiroba. An answer that comes after the session ended is dropped,
// so one player's undo is never offered to the next.
export function useUndoOffer<K extends WriteKind>(
  port: HirobaSessionPort,
  kind: K,
  sessionGeneration: RefObject<number>,
) {
  const [undoable, setUndoable] = useState<UndoSummaryOf<K> | null>(null);

  const refreshUndo = useCallback(async () => {
    const mine = sessionGeneration.current;
    const offered = await port.pendingUndo();
    if (mine === sessionGeneration.current) {
      // `kind` names the summary's own sets, so the one found is the kind's.
      setUndoable((offered.find((one) => one.kind === kind) ?? null) as UndoSummaryOf<K> | null);
    }
  }, [port, kind, sessionGeneration]);

  const clearUndo = useCallback(() => setUndoable(null), []);

  return { undoable, refreshUndo, clearUndo };
}
