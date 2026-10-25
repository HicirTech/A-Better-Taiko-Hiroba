import type { Translator } from "@abth/i18n";
import { Box, Button, Stack } from "@mui/material";
import { useState } from "react";
import type { FavoriteSet } from "../shared/sets/favorite-sets";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { type DetailsOpener, SongLookRow } from "../songs/song-look-row";
import { ChoiceDialog } from "../ui/choice-dialog";
import { CheckIcon } from "../ui/icons";
import { LabelChip } from "../ui/label-chip";
import type { ModalLook } from "../ui/large-modal";
import { CARD_ROWS, SectionCard } from "../ui/section-card";
import { SectionTitle } from "../ui/section-title";
import { SimpleDialog } from "../ui/simple-dialog";
import { StatusNote } from "../ui/status-note";
import type { ShownFavorites } from "./favorites-state";

export interface FolderCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly i18n: Translator;
  readonly openDetails: DetailsOpener;
  /** The kept sets, to save the folder into one of them. */
  readonly sets: readonly FavoriteSet[];
  /** The set whose songs are the folder's, in its order; null when no set is. */
  readonly inUse: FavoriteSet | null;
  readonly onSaveAsSet: () => void;
  readonly onSaveToSet: (id: string) => void;
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
}

/** The songs in the お気に入り folder in slot order, under the set it is or the ways to keep it. */
export function FolderCard({
  shown,
  look,
  shownDifficulty,
  i18n,
  openDetails,
  sets,
  inUse,
  onSaveAsSet,
  onSaveToSet,
  touchFirst,
  modalLook,
}: FolderCardProps) {
  const { t } = i18n;
  const { view, shut } = shown;
  const songs = view.folder.state.slots.flatMap((songNo, index) =>
    songNo === null ? [] : [{ slot: index + 1, songNo }],
  );
  const [choosing, setChoosing] = useState(false);
  const [replacing, setReplacing] = useState<FavoriteSet | null>(null);
  const stopReplacing = () => setReplacing(null);
  return (
    <SectionCard id="favorite-folder-card">
      <SectionTitle
        level={3}
        end={
          inUse !== null ? (
            <LabelChip
              id="favorite-folder-set"
              icon={<CheckIcon fontSize="small" />}
              label={t("favorites.inUse", { name: inUse.name })}
            />
          ) : (
            songs.length > 0 && (
              <>
                <Button
                  id="favorite-folder-save-as-set"
                  variant="outlined"
                  size="small"
                  disabled={shut}
                  onClick={onSaveAsSet}
                >
                  {t("favorites.saveAsSet")}
                </Button>
                {sets.length > 0 && (
                  <Button
                    id="favorite-folder-save-to-set"
                    variant="outlined"
                    size="small"
                    disabled={shut}
                    aria-haspopup="dialog"
                    onClick={() => setChoosing(true)}
                  >
                    {t("favorites.saveToSet")}
                  </Button>
                )}
              </>
            )
          )
        }
      >
        {t("favorites.folder.heading")}
      </SectionTitle>
      <Stack spacing={1.5} useFlexGap>
        {songs.length === 0 ? (
          <StatusNote id="favorite-folder-empty">{t("favorites.folderEmpty")}</StatusNote>
        ) : (
          <Box component="ul" id="favorite-folder-list" sx={CARD_ROWS}>
            {songs.map(({ slot, songNo }) => (
              <SongLookRow
                key={slot}
                id={`favorite-folder-slot-${slot}`}
                look={look(songNo)}
                shownDifficulty={shownDifficulty}
                i18n={i18n}
                scrolling
                onOpen={openDetails(songNo)}
              />
            ))}
          </Box>
        )}
      </Stack>
      {choosing && (
        <ChoiceDialog
          id="favorite-folder-sets"
          title={t("favorites.saveToSet")}
          subtitle={null}
          choices={sets.map((set, index) => ({
            id: `favorite-folder-save-to-set-${index}`,
            primary: set.name,
            secondary: null,
            onChoose: () => setReplacing(set),
          }))}
          touchFirst={touchFirst}
          modalLook={modalLook}
          i18n={i18n}
          onClose={() => setChoosing(false)}
        />
      )}
      <SimpleDialog
        id="favorite-folder-replace-dialog"
        open={replacing !== null}
        title={t("favorites.replace.title", { name: replacing?.name ?? "" })}
        message={t("favorites.replace.body", { name: replacing?.name ?? "" })}
        cancel={{ id: "favorite-folder-replace-cancel", label: t("favorites.delete.cancel") }}
        actions={[
          {
            id: "favorite-folder-replace-confirm",
            label: t("favorites.replace.confirm"),
            destructive: true,
            onClick: () => {
              if (replacing !== null) {
                onSaveToSet(replacing.id);
              }
              stopReplacing();
              setChoosing(false);
            },
          },
        ]}
        onClose={stopReplacing}
      />
    </SectionCard>
  );
}
