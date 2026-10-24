import { useCallback, useRef, useState } from "react";

import {
  addSet,
  type FavoriteSet,
  keepSets,
  loadSets,
  moved,
  removeSet,
  renameSet,
  setSongs,
} from "./favorite-sets";

export interface FavoriteSets {
  readonly sets: readonly FavoriteSet[];
  /** Adds a set at the end and gives its id. */
  add(name: string, songs: readonly string[]): string;
  rename(id: string, name: string): void;
  /** Gives the set these songs in place of its own. */
  replaceSongs(id: string, songs: readonly string[]): void;
  /** Puts the set at `from` in place `to` among the sets. */
  moveSet(from: number, to: number): void;
  remove(id: string): void;
}

/** The player's sets, kept on this device at once with every change. */
export function useFavoriteSets(): FavoriteSets {
  const [sets, setSets] = useState(loadSets);
  // The latest list, so two changes in one tick each build on the one before.
  const latest = useRef(sets);
  const commit = useCallback((next: readonly FavoriteSet[]) => {
    latest.current = next;
    keepSets(next);
    setSets(next);
  }, []);

  const add = useCallback(
    (name: string, songs: readonly string[]) => {
      const { sets: next, added } = addSet(latest.current, name, songs);
      commit(next);
      return added.id;
    },
    [commit],
  );
  const rename = useCallback(
    (id: string, name: string) => commit(renameSet(latest.current, id, name)),
    [commit],
  );
  const replaceSongs = useCallback(
    (id: string, songs: readonly string[]) => commit(setSongs(latest.current, id, songs)),
    [commit],
  );
  const moveSet = useCallback(
    (from: number, to: number) => commit(moved(latest.current, from, to)),
    [commit],
  );
  const remove = useCallback((id: string) => commit(removeSet(latest.current, id)), [commit]);
  return { sets, add, rename, replaceSongs, moveSet, remove };
}
