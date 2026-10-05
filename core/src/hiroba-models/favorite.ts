import type { Genre } from "./vocabulary";

/** How many songs the お気に入り folder holds. */
export const FOLDER_SLOT_COUNT = 30;

/** A song number as the favourite pages carry it: one to five digits. */
export function isSongNo(value: string): boolean {
  return /^\d{1,5}$/.test(value);
}

/** The お気に入り folder: its slots in order, 1 to 30, each a song number or null when empty. */
export interface FolderState {
  readonly slots: readonly (string | null)[];
}

/** The 大好きな曲: its song number, or null when none is set. */
export interface FavoriteSongState {
  readonly songNo: string | null;
  /** The song's 裏 entry rather than the song; false when none is set. */
  readonly ura: boolean;
}

/** The songs Hiroba's own 大好きな曲 picker offers, by number, and those it offers a 裏 entry of. */
export interface PickableSongs {
  readonly songs: readonly string[];
  readonly ura: readonly string[];
}

/** A song as a favourite editor shows it: Hiroba's own title and genre. */
export interface ShownSong {
  readonly songNo: string;
  readonly title: string;
  /** Null when the page names no genre this app knows. */
  readonly genre: Genre | null;
}
