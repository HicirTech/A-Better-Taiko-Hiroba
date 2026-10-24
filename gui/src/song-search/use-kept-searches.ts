import { useCallback, useMemo, useState } from "react";

import { forgetSearch, keptSearches, rememberSearch } from "./search-history";

/** The searches kept on this device, as the window holds them. */
export interface KeptSearches {
  readonly searches: readonly string[];
  /** Keeps a query as the latest search. */
  remember(query: string): void;
  forget(query: string): void;
  /** Reads the searches again from the device, as the Overview opens. */
  reload(): void;
}

export function useKeptSearches(): KeptSearches {
  const [searches, setSearches] = useState(keptSearches);
  const remember = useCallback((query: string) => setSearches(rememberSearch(query)), []);
  const forget = useCallback((query: string) => setSearches(forgetSearch(query)), []);
  const reload = useCallback(() => setSearches(keptSearches()), []);
  return useMemo(
    () => ({ searches, remember, forget, reload }),
    [searches, remember, forget, reload],
  );
}
