import type { Difficulty } from "@abth/core";
import { useCallback, useState } from "react";

import type { ListedSong } from "../shared/song-catalogue/use-song-catalogue";

/** The song a page's details stand open on, opened and closed by its number. */
export interface SongDetailsState {
  /** None while shut, and once the list no longer holds the song. */
  readonly song: ListedSong | null;
  /** The chart they open on, where one was asked for. */
  readonly difficulty: Difficulty | null;
  /** Opened and not closed yet, whatever the list holds. */
  readonly shown: boolean;
  readonly open: (songNo: string, difficulty?: Difficulty) => void;
  readonly close: () => void;
}

/** The song whose details stand over a page, looked up in `songs` as they are now. */
export function useSongDetails(songs: ReadonlyMap<string, ListedSong>): SongDetailsState {
  const [opened, setOpened] = useState<{
    readonly songNo: string;
    readonly difficulty: Difficulty | null;
  } | null>(null);
  const open = useCallback(
    (songNo: string, difficulty?: Difficulty) =>
      setOpened({ songNo, difficulty: difficulty ?? null }),
    [],
  );
  const close = useCallback(() => setOpened(null), []);
  return {
    song: opened === null ? null : (songs.get(opened.songNo) ?? null),
    difficulty: opened?.difficulty ?? null,
    shown: opened !== null,
    open,
    close,
  };
}
