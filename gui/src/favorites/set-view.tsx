import type { Translator } from "@abth/i18n";
import { Box, Button, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";

import { Waiting } from "../my-page/editor-parts";
import { CloseIcon } from "./favorites-icons";
import type { SongLook } from "./song-look";
import { type DetailsOpener, SongRow } from "./song-row";
import { SortableList } from "./sortable-list";

const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1,
} as const;

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
  /** The folder is read and no write runs, and applying the set would change it. */
  readonly canApply: boolean;
  /** The folder is being written. */
  readonly applying: boolean;
  /** While editing, a long press moves a song, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly onEdit: () => void;
  readonly onAddSongs: () => void;
  readonly onRemoveSong: (songNo: string) => void;
  readonly onMoveSong: (from: number, to: number) => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
  readonly onApply: () => void;
}

/** A set: shown with Edit and Apply, and while edited with Add songs, Reset and Save. */
export function SetView({
  songs: songNos,
  look,
  i18n,
  openDetails,
  editing,
  edited,
  canApply,
  applying,
  byLongPress,
  onEdit,
  onAddSongs,
  onRemoveSong,
  onMoveSong,
  onReset,
  onSave,
  onApply,
}: SetViewProps) {
  const { t } = i18n;
  const songs = songNos.map((songNo) => ({ key: songNo, name: look(songNo).name }));
  return (
    <Card id="favorite-set-view" variant="outlined" data-editing={editing}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {editing ? (
              <>
                <Button id="favorite-set-add" variant="outlined" onClick={onAddSongs}>
                  {t("favorites.addSongs")}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                {edited && (
                  <Button id="favorite-set-reset" onClick={onReset}>
                    {t("costume.reset")}
                  </Button>
                )}
                <Button id="favorite-set-save" variant="contained" onClick={onSave}>
                  {t("favorites.saveSet")}
                </Button>
              </>
            ) : (
              <>
                <Button id="favorite-set-edit" variant="outlined" onClick={onEdit}>
                  {t("favorites.edit")}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  id="favorite-set-apply"
                  variant="contained"
                  disabled={!canApply}
                  onClick={onApply}
                >
                  {t("favorites.apply")}
                </Button>
              </>
            )}
          </Box>
          {applying && <Waiting id="favorite-set-applying">{t("costume.saving")}</Waiting>}
          {songs.length === 0 ? (
            <Typography id="favorite-set-empty" color="text.secondary">
              {t("favorites.setEmpty")}
            </Typography>
          ) : editing ? (
            <SortableList
              id="favorite-set-songs"
              items={songs}
              byLongPress={byLongPress}
              i18n={i18n}
              onMove={onMoveSong}
              renderItem={(songNo, handle) => {
                const shown = look(songNo);
                const label = t("favorites.removeSong", { name: shown.name });
                return (
                  <SongRow
                    id={`favorite-set-song-${songNo}`}
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
                        <CloseIcon />
                      </IconButton>
                    }
                  />
                );
              }}
            />
          ) : (
            <Box component="ul" id="favorite-set-songs" sx={LIST}>
              {songNos.map((songNo) => (
                <li key={songNo} data-key={songNo}>
                  <SongRow
                    id={`favorite-set-song-${songNo}`}
                    look={look(songNo)}
                    i18n={i18n}
                    scrolling
                    onOpen={openDetails(songNo)}
                  />
                </li>
              ))}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
