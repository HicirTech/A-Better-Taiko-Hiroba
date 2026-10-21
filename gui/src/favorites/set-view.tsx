import type { Translator } from "@abth/i18n";
import { Box, Button, IconButton, Stack } from "@mui/material";

import { CloseIcon } from "../ui/icons";
import { CARD_ROWS, SectionCard, TO_THE_CARD_SIDES } from "../ui/section-card";
import { StatusNote } from "../ui/status-note";
import type { SongLook } from "./song-look";
import { type DetailsOpener, SongLookRow } from "./song-look-row";
import { SortableList } from "./sortable-list";

const SORTED_ROWS = { gap: 0, ...TO_THE_CARD_SIDES } as const;

export interface SetViewProps {
  /** The songs as shown: the set's own, or, while it is edited, the edits. */
  readonly songs: readonly string[];
  readonly look: (songNo: string) => SongLook;
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
  songs: songNos,
  look,
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
  const songs = songNos.map((songNo) => ({ key: songNo, name: look(songNo).name }));
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
          <SortableList
            id="favorite-set-songs"
            items={songs}
            byLongPress={byLongPress}
            i18n={i18n}
            onMove={onMoveSong}
            sx={SORTED_ROWS}
            renderItem={(songNo, handle) => {
              const shown = look(songNo);
              const label = t("favorites.removeSong", { name: shown.name });
              return (
                <SongLookRow
                  id={`favorite-set-song-${songNo}`}
                  component="div"
                  look={shown}
                  i18n={i18n}
                  scrolling
                  start={handle}
                  end={
                    <IconButton
                      size="small"
                      aria-label={label}
                      title={label}
                      data-song-no={songNo}
                      onClick={() => onRemoveSong(songNo)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                />
              );
            }}
          />
        ) : (
          <Box component="ul" id="favorite-set-songs" sx={CARD_ROWS}>
            {songNos.map((songNo) => (
              <SongLookRow
                key={songNo}
                id={`favorite-set-song-${songNo}`}
                data-key={songNo}
                look={look(songNo)}
                i18n={i18n}
                scrolling
                onOpen={openDetails(songNo)}
              />
            ))}
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
}
