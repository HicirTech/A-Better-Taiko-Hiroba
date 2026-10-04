import { useCallback, useRef, useState } from "react";

import {
  addSet,
  type FavoriteSet,
  keepSets,
  loadSets,
  removeSet,
  renameSet,
  setSongs,
  toggledSongs,
} from "./favorite-sets";

export interface FavoriteSets {
  readonly sets: readonly FavoriteSet[];
  /** Adds a set at the end and gives its id. */
  add(name: string, songs: readonly string[]): string;
  rename(id: string, name: string): void;
  /** Takes a song out of the set if it is in, else adds it at the end. */
  toggleSong(id: string, songNo: string): void;
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
  const toggleSong = useCallback(
    (id: string, songNo: string) => {
      const set = latest.current.find((one) => one.id === id);
      if (set !== undefined) {
        commit(setSongs(latest.current, id, toggledSongs(set.songs, songNo)));
      }
    },
    [commit],
  );
  const remove = useCallback((id: string) => commit(removeSet(latest.current, id)), [commit]);
  return { sets, add, rename, toggleSong, remove };
}
