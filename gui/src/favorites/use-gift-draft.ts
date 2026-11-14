import { useCallback, useMemo } from "react";

import { GIFT_SONG_LIMIT } from "../shared/gifts/gift-code";
import { toggledSongs } from "../shared/sets/favorite-sets";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import type { GiftDraft } from "./gift-maker";
import { everySong, type PickableState } from "./pickable-songs";
import type { SongChoice } from "./song-picker";
import type { FavoritesLevel } from "./use-favorites-level";

const NO_SONGS: readonly string[] = [];

export interface GiftEdit {
  /** Starts a gift with no songs, its picture shown. */
  start(): void;
  /** Changes the gift, its time then being the time of this change. */
  change(change: (now: GiftDraft) => Partial<GiftDraft>): void;
  /** The gift's picker: songs checked in or out, up to a gift's limit. */
  readonly choice: SongChoice;
  /** Every song of the list: whether its receiver has each is that player's Hiroba to say. */
  readonly pickable: PickableState;
}

/** The gift being made, which the page's level holds. */
export function useGiftDraft(
  { gift, setGift }: Pick<FavoritesLevel, "gift" | "setGift">,
  catalogue: Pick<SongCatalogue, "list">,
): GiftEdit {
  const change = useCallback(
    (changed: (now: GiftDraft) => Partial<GiftDraft>) =>
      setGift((now) => (now === null ? null : { ...now, ...changed(now), madeAt: Date.now() })),
    [setGift],
  );
  const toggle = useCallback(
    (songNo: string) => change((now) => ({ songs: toggledSongs(now.songs, songNo) })),
    [change],
  );
  const songs = gift?.songs ?? NO_SONGS;
  const choice = useMemo(
    () => ({ kind: "many", picked: songs, limit: GIFT_SONG_LIMIT, onToggle: toggle }) as const,
    [songs, toggle],
  );
  const pickable = useMemo(
    () => everySong(catalogue.list.map((song) => song.songNo)),
    [catalogue.list],
  );
  return {
    start: () => setGift({ songs: [], title: "", shown: true, madeAt: Date.now() }),
    change,
    choice,
    pickable,
  };
}
