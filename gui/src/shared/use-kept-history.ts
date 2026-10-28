import { type RefObject, useCallback, useState } from "react";

// Asked of the platform, never of Hiroba. An answer that comes after the session ended is dropped,
// so one player's history is never shown to the next.
export function useKeptHistory<Entry>(
  read: () => Promise<readonly Entry[]>,
  sessionGeneration: RefObject<number>,
) {
  const [history, setHistory] = useState<readonly Entry[]>([]);

  const refreshHistory = useCallback(async () => {
    const mine = sessionGeneration.current;
    try {
      const entries = await read();
      if (mine === sessionGeneration.current) {
        setHistory(entries);
      }
    } catch {
      // A history that cannot be read stays as it was, and says nothing.
    }
  }, [read, sessionGeneration]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, refreshHistory, clearHistory };
}
