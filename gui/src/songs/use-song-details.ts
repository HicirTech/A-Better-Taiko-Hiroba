import { useCallback, useState } from "react";

import type { ListedSong } from "../shared/song-catalogue/use-song-catalogue";

/** The song a page's details stand open on, opened and closed by its number. */
export interface SongDetailsState {
  /** None while shut, and once the list no longer holds the song. */
  readonly song: ListedSong | null;
  /** Opened and not closed yet, whatever the list holds. */
  readonly shown: boolean;
  readonly open: (songNo: string) => void;
  readonly close: () => void;
}

/** The song whose details stand over a page, looked up in `songs` as they are now. */
export function useSongDetails(songs: ReadonlyMap<string, ListedSong>): SongDetailsState {
  const [songNo, setSongNo] = useState<string | null>(null);
  const open = useCallback((next: string) => setSongNo(next), []);
  const close = useCallback(() => setSongNo(null), []);
  return {
    song: songNo === null ? null : (songs.get(songNo) ?? null),
    shown: songNo !== null,
    open,
    close,
  };
}
