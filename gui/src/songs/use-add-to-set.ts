import type { Translator } from "@abth/i18n";
import { useCallback, useState } from "react";

import { type FavoriteSet, newSetName } from "../shared/sets/favorite-sets";
import type { FavoriteSets } from "../shared/sets/use-favorite-sets";
import type { SetNameDialogProps } from "./set-name-dialog";

/** Songs going into a set on the device: one the chooser offers, or a new one named first. */
export interface AddToSet<T> {
  /** What the chooser asks a set for, or none while it is shut. */
  readonly adding: T | null;
  readonly choose: (what: T) => void;
  readonly close: () => void;
  /** Puts the songs at the set's end, and shuts the chooser. */
  readonly addTo: (set: FavoriteSet, songs: readonly string[]) => void;
  /** Asks a new set's name over the chooser, keeping the songs the set starts with. */
  readonly nameNew: (songs: readonly string[]) => void;
  /** The name's question while it asks: Cancel goes back to the chooser, Save shuts both. */
  readonly naming: SetNameDialogProps | null;
}

export function useAddToSet<T>(keptSets: FavoriteSets, i18n: Translator): AddToSet<T> {
  const { t } = i18n;
  const [adding, setAdding] = useState<T | null>(null);
  const [naming, setNaming] = useState<readonly string[] | null>(null);
  const choose = useCallback((what: T) => setAdding(() => what), []);
  const close = useCallback(() => setAdding(null), []);
  const nameNew = useCallback((songs: readonly string[]) => setNaming(songs), []);
  const addTo = useCallback(
    (set: FavoriteSet, songs: readonly string[]) => {
      keptSets.replaceSongs(set.id, [...set.songs, ...songs]);
      setAdding(null);
    },
    [keptSets],
  );
  return {
    adding,
    choose,
    close,
    addTo,
    nameNew,
    naming:
      naming === null
        ? null
        : {
            title: t("favorites.newSet"),
            initial: newSetName(keptSets.sets, (count) =>
              t("favorites.setName", { number: count }),
            ),
            i18n,
            onCancel: () => setNaming(null),
            onSave: (name) => {
              keptSets.add(name, naming);
              setNaming(null);
              setAdding(null);
            },
          },
  };
}
