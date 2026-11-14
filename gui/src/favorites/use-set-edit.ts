import { useCallback, useMemo } from "react";

import { SET_SONG_LIMIT, sameSongs, toggledSongs } from "../shared/sets/favorite-sets";
import type { SongChoice } from "./song-picker";
import type { FavoritesLevel } from "./use-favorites-level";

const NO_SONGS: readonly string[] = [];

export interface SetEdit {
  /** The set's songs with its edits, or as kept. */
  readonly songs: readonly string[];
  /** Whether the edits differ from the set as kept. */
  readonly edited: boolean;
  /** Edits the songs, starting from the set as kept. */
  edit(change: (songs: readonly string[]) => readonly string[]): void;
  /** The set's picker: songs checked in or out, up to a set's limit. */
  readonly choice: SongChoice;
}

/** The edits of the set shown, which wait in the page's draft until Save keeps them. */
export function useSetEdit({
  set,
  draft,
  setDraft,
}: Pick<FavoritesLevel, "set" | "draft" | "setDraft">): SetEdit {
  const savedSongs = set?.songs ?? NO_SONGS;
  const songs = draft ?? savedSongs;
  const edit = useCallback(
    (change: (songs: readonly string[]) => readonly string[]) =>
      setDraft((now) => change(now ?? savedSongs)),
    [setDraft, savedSongs],
  );
  const toggle = useCallback((songNo: string) => edit((now) => toggledSongs(now, songNo)), [edit]);
  const choice = useMemo(
    () => ({ kind: "many", picked: songs, limit: SET_SONG_LIMIT, onToggle: toggle }) as const,
    [songs, toggle],
  );
  return { songs, edited: draft !== null && !sameSongs(draft, savedSongs), edit, choice };
}
