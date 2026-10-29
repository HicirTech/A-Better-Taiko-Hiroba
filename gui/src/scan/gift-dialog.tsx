import type { Translator } from "@abth/i18n";

import type { Gift } from "../shared/gifts/gift-code";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SetSongs } from "../songs/set-songs";
import { SimpleDialog } from "../ui/simple-dialog";

export interface GiftDialogProps {
  /** The gift scanned; none before the first. */
  readonly gift: Gift | null;
  /** Shut, it slides away showing the gift it showed. */
  readonly open: boolean;
  /** Accept was pressed, and the songs are on their way to Hiroba's folder. */
  readonly syncing: boolean;
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly i18n: Translator;
  readonly onAccept: (gift: Gift) => void;
  readonly onClose: () => void;
}

/** A gift scanned: who gave it and when, its songs or that they are a mystery, and Accept. */
export function GiftDialog({
  gift,
  open,
  syncing,
  look,
  shownDifficulty,
  i18n,
  onAccept,
  onClose,
}: GiftDialogProps) {
  const { t, dateTime } = i18n;
  if (gift === null) {
    return null;
  }
  const given = { giver: gift.giver, time: dateTime(gift.madeAt) };
  return (
    <SimpleDialog
      id="gift-dialog"
      open={open}
      title={gift.title === "" ? t("gift.untitled") : gift.title}
      message={t(gift.shown ? "gift.offer" : "gift.offerMystery", given)}
      cancel={{ id: "gift-dialog-cancel", label: t("favorites.delete.cancel") }}
      actions={[
        { id: "gift-dialog-accept", label: t("gift.accept"), onClick: () => onAccept(gift) },
      ]}
      busy={syncing ? t("write.saving") : undefined}
      onClose={onClose}
    >
      {gift.shown && (
        <SetSongs
          id="gift-dialog"
          songs={gift.songs}
          look={look}
          shownDifficulty={shownDifficulty}
          i18n={i18n}
        />
      )}
    </SimpleDialog>
  );
}
