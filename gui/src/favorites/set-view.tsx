import type { Translator } from "@abth/i18n";
import { Box, Button, Stack } from "@mui/material";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SetSongs } from "../songs/set-songs";
import type { DetailsOpener } from "../songs/song-look-row";
import { SectionCard } from "../ui/section-card";
import { StatusNote } from "../ui/status-note";
import { EditedSongs } from "./edited-songs";

export interface SetViewProps {
  /** The songs as shown: the set's own, or, while it is edited, the edits. */
  readonly songs: readonly string[];
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly i18n: Translator;
  /** Opens a song's details while the set is only shown, not edited. */
  readonly openDetails: DetailsOpener;
  /** Edit was pressed: the songs can be added, taken out and moved until Save. */
  readonly editing: boolean;
  /** The edits differ from the set's songs, so Reset can drop them. */
  readonly edited: boolean;
  /** While editing, a long press moves a song, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly onEdit: () => void;
  readonly onAddSongs: () => void;
  readonly onRemoveSong: (songNo: string) => void;
  readonly onMoveSong: (from: number, to: number) => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
}

/** A set: shown with Edit, edited with Add songs, Reset and Save; the page's bar syncs it. */
export function SetView({
  songs,
  look,
  shownDifficulty,
  i18n,
  openDetails,
  editing,
  edited,
  byLongPress,
  onEdit,
  onAddSongs,
  onRemoveSong,
  onMoveSong,
  onReset,
  onSave,
}: SetViewProps) {
  const { t } = i18n;
  return (
    <SectionCard id="favorite-set-view" data-editing={editing}>
      <Stack spacing={1.5} useFlexGap>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {editing ? (
            <>
              <Button id="favorite-set-add" variant="outlined" onClick={onAddSongs}>
                {t("favorites.addSongs")}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              {edited && (
                <Button id="favorite-set-reset" onClick={onReset}>
                  {t("edit.reset")}
                </Button>
              )}
              <Button id="favorite-set-save" variant="contained" onClick={onSave}>
                {t("favorites.saveSet")}
              </Button>
            </>
          ) : (
            <Button id="favorite-set-edit" variant="outlined" onClick={onEdit}>
              {t("favorites.edit")}
            </Button>
          )}
        </Box>
        {songs.length === 0 ? (
          <StatusNote id="favorite-set-empty">{t("favorites.setEmpty")}</StatusNote>
        ) : editing ? (
          <EditedSongs
            id="favorite-set"
            songs={songs}
            look={look}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            byLongPress={byLongPress}
            onRemove={onRemoveSong}
            onMove={onMoveSong}
          />
        ) : (
          <SetSongs
            id="favorite-set"
            songs={songs}
            look={look}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            openDetails={openDetails}
          />
        )}
      </Stack>
    </SectionCard>
  );
}
