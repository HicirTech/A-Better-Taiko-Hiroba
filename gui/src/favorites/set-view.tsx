import type { Translator } from "@abth/i18n";
import { Box, Button, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";

import { Waiting } from "../my-page/editor-parts";
import { CloseIcon } from "./favorites-icons";
import type { SongLook } from "./song-look";
import { SongRow } from "./song-row";
import { SortableList } from "./sortable-list";

export interface SetViewProps {
  /** The songs as edited, which are the set's own until something changes them. */
  readonly songs: readonly string[];
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  /** The songs differ from the set's saved ones: they are saved before the set can be applied. */
  readonly edited: boolean;
  /** The folder is read and no write runs, and applying the saved set would change it. */
  readonly canApply: boolean;
  /** The folder is being written. */
  readonly applying: boolean;
  /** A long press moves a song, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly onAddSongs: () => void;
  readonly onRemoveSong: (songNo: string) => void;
  readonly onMoveSong: (from: number, to: number) => void;
  readonly onSave: () => void;
  readonly onDiscard: () => void;
  readonly onApply: () => void;
}

/** A set's actions above its songs, which move and come out; one button saves, then applies. */
export function SetView({
  songs: songNos,
  look,
  i18n,
  edited,
  canApply,
  applying,
  byLongPress,
  onAddSongs,
  onRemoveSong,
  onMoveSong,
  onSave,
  onDiscard,
  onApply,
}: SetViewProps) {
  const { t } = i18n;
  const songs = songNos.map((songNo) => ({ key: songNo, name: look(songNo).name }));
  return (
    <Card id="favorite-set-view" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Button id="favorite-set-add" variant="outlined" onClick={onAddSongs}>
              {t("favorites.addSongs")}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            {edited ? (
              <>
                <Button id="favorite-set-discard" onClick={onDiscard}>
                  {t("costume.reset")}
                </Button>
                <Button id="favorite-set-save" variant="contained" onClick={onSave}>
                  {t("favorites.saveSet")}
                </Button>
              </>
            ) : (
              <Button
                id="favorite-set-apply"
                variant="contained"
                disabled={!canApply}
                onClick={onApply}
              >
                {t("favorites.apply")}
              </Button>
            )}
          </Box>
          {applying && <Waiting id="favorite-set-applying">{t("costume.saving")}</Waiting>}
          {songs.length === 0 ? (
            <Typography id="favorite-set-empty" color="text.secondary">
              {t("favorites.setEmpty")}
            </Typography>
          ) : (
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
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
