import { SET_SONG_LIMIT } from "../favorites/favorite-sets";
import type { ShownFavorites } from "../favorites/favorites-state";
import type { PickableState } from "../favorites/pickable-songs";
import type { FavoritesView, ShownSong } from "../shared/session-port";
import { STORY_SONGS, storySong } from "./songs";

/** The お気に入り folder's songs, in slot order. */
export const FOLDER_SONGS: readonly string[] = ["1001", "1005", "1008", "1012", "1004"];

const shownSongOf = (songNo: string): ShownSong => {
  const song = storySong(songNo);
  return { songNo, title: song.title, genre: song.genres[0] ?? null };
};

/** The two favourite editors as Hiroba shows them. */
export function storyFavorites(
  folder: readonly string[] = FOLDER_SONGS,
  favoriteSong: string | null = "1001",
): FavoritesView {
  return {
    folder: {
      state: { slots: Array.from({ length: SET_SONG_LIMIT }, (_, at) => folder[at] ?? null) },
      songs: folder.map(shownSongOf),
    },
    song: {
      state: { songNo: favoriteSong, ura: false },
      song: favoriteSong === null ? null : shownSongOf(favoriteSong),
    },
  };
}

/** The favourites as the page draws them, open to presses. */
export const shownFavorites = (changes: Partial<ShownFavorites> = {}): ShownFavorites => ({
  view: storyFavorites(),
  draft: null,
  notice: null,
  shut: false,
  saving: null,
  ...changes,
});

/** Every stand-in song offered, and the inner chart of each that has one. */
export const STORY_PICKABLE: PickableState = {
  offered: {
    songs: new Set(STORY_SONGS.map((song) => song.songNo)),
    ura: new Set(STORY_SONGS.filter((song) => song.levels.ura !== null).map((song) => song.songNo)),
  },
  status: { kind: "current" },
};
