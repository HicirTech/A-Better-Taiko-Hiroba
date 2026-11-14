import type { Translator } from "@abth/i18n";
import { Button } from "@mui/material";

import { type FavoriteSet, sameSongs, setWithSongs } from "../shared/sets/favorite-sets";
import { BAR_TEXT_BUTTON, SyncBar } from "../ui/sync-bar";
import type { ShownFavorites } from "./favorites-state";
import type { FavoritesEditor } from "./use-favorites";
import type { FavoritesLevel } from "./use-favorites-level";

const NO_SONGS: readonly string[] = [];

export interface FavoritesSyncBarProps {
  readonly favorites: FavoritesEditor;
  /** Hiroba's favourites as the page shows them; null before they are read. */
  readonly shown: ShownFavorites | null;
  readonly level: Pick<FavoritesLevel, "set" | "putBack" | "editing" | "showSet">;
  readonly sets: readonly FavoriteSet[];
  /** The songs in the お気に入り folder, in slot order; null before they are read. */
  readonly folderSongs: readonly string[] | null;
  /** The kept set whose songs the folder holds; null for none. */
  readonly inUse: FavoriteSet | null;
  /** Takes the focus from the button a write shuts, so it is not dropped to the window's top. */
  readonly keepFocus: () => void;
  readonly onHistory: () => void;
  readonly i18n: Translator;
}

/** The page's bar: it syncs the set or the kept folder shown, else the 大好きな曲 picked. */
export function FavoritesSyncBar({
  favorites,
  shown,
  level,
  sets,
  folderSongs,
  inUse,
  keepFocus,
  onHistory,
  i18n,
}: FavoritesSyncBarProps) {
  const { set, putBack, editing, showSet } = level;
  if (set === null && shown === null) {
    return null;
  }

  const saveSong = () => {
    keepFocus();
    void favorites.saveSong();
  };
  const apply = async (songs: readonly string[]) => {
    keepFocus();
    await favorites.applySet(songs, {
      expected: inUse?.name ?? null,
      target: setWithSongs(sets, songs)?.name ?? null,
    });
    showSet(null);
  };
  // A set shown syncs as it is kept; its edits, on the device, wait for Save first.
  const canApply =
    set !== null &&
    !editing &&
    shown !== null &&
    !shown.shut &&
    set.songs.length > 0 &&
    !sameSongs(set.songs, folderSongs ?? NO_SONGS);
  const canPutBack =
    putBack !== null &&
    shown !== null &&
    !shown.shut &&
    putBack.songs.length > 0 &&
    !sameSongs(putBack.songs, folderSongs ?? NO_SONGS);
  const songPicked = shown !== null && !shown.shut && shown.draft !== null;
  return (
    <SyncBar
      id="favorites"
      canSync={set !== null ? canApply : putBack !== null ? canPutBack : songPicked}
      onSync={
        set !== null
          ? () => void apply(set.songs)
          : putBack !== null
            ? () => void apply(putBack.songs)
            : saveSong
      }
      onReset={set !== null || putBack !== null ? undefined : favorites.resetSong}
      canReset={songPicked}
      saving={shown !== null && shown.saving !== null}
      start={
        set === null &&
        putBack === null && (
          <Button
            id="favorites-history"
            disabled={shown === null || shown.shut || favorites.history.length === 0}
            onClick={onHistory}
            sx={BAR_TEXT_BUTTON}
          >
            {i18n.t("favorites.history")}
          </Button>
        )
      }
      i18n={i18n}
    />
  );
}
