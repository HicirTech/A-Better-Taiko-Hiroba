import { type RefObject, useCallback, useState } from "react";

import type { CostumeHistoryEntry, HirobaSessionPort } from "../session-port";

// Asked of the platform, never of Hiroba. An answer that comes after the session ended is dropped,
// so one player's history is never shown to the next.
export function useCostumeHistory(port: HirobaSessionPort, sessionGeneration: RefObject<number>) {
  const [history, setHistory] = useState<readonly CostumeHistoryEntry[]>([]);

  const refreshHistory = useCallback(async () => {
    const mine = sessionGeneration.current;
    try {
      const entries = await port.costumeHistory();
      if (mine === sessionGeneration.current) {
        setHistory(entries);
      }
    } catch {
      // A history that cannot be read stays as it was, and says nothing.
    }
  }, [port, sessionGeneration]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, refreshHistory, clearHistory };
}
