import type { Translator } from "@abth/i18n";

import { type Choice, ChoiceDialog } from "../favorites/choice-dialog";
import { addableSongs, type FavoriteSet, SET_SONG_LIMIT } from "../favorites/favorite-sets";

/** Asks which set on this device takes the songs, or a new one; each takes what it has room for. */
export function AddSongsDialog({
  songs,
  sets,
  i18n,
  onAdd,
  onNewSet,
  onClose,
}: {
  readonly songs: readonly string[];
  readonly sets: readonly FavoriteSet[];
  readonly i18n: Translator;
  readonly onAdd: (set: FavoriteSet, added: readonly string[]) => void;
  readonly onNewSet: () => void;
  readonly onClose: () => void;
}) {
  const { t, number } = i18n;
  const takes = (count: number) =>
    count < songs.length
      ? t("know.setTakes", { count: number(count), total: number(songs.length) })
      : null;
  const choices: readonly Choice[] = [
    ...sets.map((set, index) => {
      const added = addableSongs(set.songs, songs);
      return {
        id: `know-add-set-${index}`,
        primary: set.name,
        secondary: songs.every((song) => set.songs.includes(song))
          ? t("know.setHoldsAll")
          : added.length === 0
            ? t("history.setFull", { count: number(SET_SONG_LIMIT) })
            : takes(added.length),
        onChoose: added.length > 0 ? () => onAdd(set, added) : null,
      };
    }),
    {
      id: "know-add-new-set",
      primary: t("favorites.newSet"),
      secondary: takes(Math.min(songs.length, SET_SONG_LIMIT)),
      onChoose: onNewSet,
    },
  ];
  return (
    <ChoiceDialog
      id="know-add-to-set"
      title={t("history.addToSet")}
      subtitle={null}
      choices={choices}
      i18n={i18n}
      onClose={onClose}
    />
  );
}
