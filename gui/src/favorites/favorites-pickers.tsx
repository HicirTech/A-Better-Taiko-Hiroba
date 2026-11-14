import type { Translator } from "@abth/i18n";
import { useMemo } from "react";

import type { FavoriteSongState } from "../shared/session-port";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import type { ModalLook } from "../ui/large-modal";
import type { PickableState } from "./pickable-songs";
import { type SongChoice, SongPicker } from "./song-picker";
import type { GiftEdit } from "./use-gift-draft";

/** The picker open: the 大好きな曲's, the set's or the gift's. */
export type Picking = "song" | "set" | "gift";

export interface FavoritesPickersProps {
  readonly picking: Picking | null;
  /** Puts a song in the draft for the 大好きな曲. */
  readonly onPickSong: (song: FavoriteSongState) => void;
  /** The set's choice, while a set is shown. */
  readonly set: SongChoice | null;
  /** The gift's choice and the songs it may hold, while a gift is made. */
  readonly gift: Pick<GiftEdit, "choice" | "pickable"> | null;
  readonly catalogue: SongCatalogue;
  /** The songs Hiroba's own picker offers, which the 大好きな曲 and a set pick from. */
  readonly pickable: PickableState;
  readonly shownDifficulty: ShownDifficulty;
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  readonly onClose: () => void;
}

/** The page's three song pickers, one open at a time. */
export function FavoritesPickers({
  picking,
  onPickSong,
  set,
  gift,
  pickable,
  ...shared
}: FavoritesPickersProps) {
  const songChoice = useMemo(() => ({ kind: "one", onPick: onPickSong }) as const, [onPickSong]);
  return (
    <>
      <SongPicker open={picking === "song"} choice={songChoice} pickable={pickable} {...shared} />
      {gift !== null && (
        <SongPicker
          open={picking === "gift"}
          choice={gift.choice}
          pickable={gift.pickable}
          {...shared}
        />
      )}
      {set !== null && (
        <SongPicker open={picking === "set"} choice={set} pickable={pickable} {...shared} />
      )}
    </>
  );
}
