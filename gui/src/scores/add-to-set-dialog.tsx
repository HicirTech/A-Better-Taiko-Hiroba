import type { Translator } from "@abth/i18n";
import { type FavoriteSet, refusedSong, SET_SONG_LIMIT } from "../shared/sets/favorite-sets";
import { type Choice, ChoiceDialog } from "../ui/choice-dialog";
import type { ModalLook } from "../ui/large-modal";

export interface AddToSetDialogProps {
  /** The chart's song as its row names it. */
  readonly name: { readonly text: string; readonly lang: string };
  readonly songNo: string;
  readonly sets: readonly FavoriteSet[];
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  readonly onAdd: (set: FavoriteSet) => void;
  readonly onNewSet: () => void;
  readonly onClose: () => void;
}

/** Asks for a new set or a set on this device to take the song, shutting those that cannot. */
export function AddToSetDialog({
  name,
  songNo,
  sets,
  touchFirst,
  modalLook,
  i18n,
  onAdd,
  onNewSet,
  onClose,
}: AddToSetDialogProps) {
  const { t, number } = i18n;
  const choices: readonly Choice[] = [
    {
      id: "scores-add-new-set",
      primary: t("favorites.newSet"),
      secondary: null,
      onChoose: onNewSet,
    },
    ...sets.map((set, index) => {
      const refused = refusedSong(set, songNo);
      return {
        id: `scores-add-set-${index}`,
        primary: set.name,
        secondary:
          refused === null
            ? null
            : refused === "holds"
              ? t("history.setHolds")
              : t("history.setFull", { count: number(SET_SONG_LIMIT) }),
        onChoose: refused === null ? () => onAdd(set) : null,
      };
    }),
  ];
  return (
    <ChoiceDialog
      id="scores-add-to-set"
      title={t("history.addToSet")}
      subtitle={name}
      choices={choices}
      touchFirst={touchFirst}
      modalLook={modalLook}
      i18n={i18n}
      onClose={onClose}
    />
  );
}
