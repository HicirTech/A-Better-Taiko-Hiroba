import type { Translator } from "@abth/i18n";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";

import { Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import type { ShownFavorites } from "./favorites-state";
import type { SongLook } from "./song-look";
import { SongRow } from "./song-row";

const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1,
} as const;

export interface FolderCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  readonly onSaveAsSet: () => void;
}

/** The songs in the お気に入り folder, in slot order, and the way to keep them as a set. */
export function FolderCard({ shown, look, i18n, onSaveAsSet }: FolderCardProps) {
  const { t } = i18n;
  const { view, notice, saving, shut } = shown;
  const songs = view.folder.state.slots.flatMap((songNo, index) =>
    songNo === null ? [] : [{ slot: index + 1, songNo }],
  );
  return (
    <Card id="favorite-folder-card" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500 }}>
            {t("favorites.folder.heading")}
          </Typography>
          {songs.length === 0 ? (
            <Typography id="favorite-folder-empty" color="text.secondary">
              {t("favorites.folderEmpty")}
            </Typography>
          ) : (
            <Box component="ul" id="favorite-folder-list" sx={LIST}>
              {songs.map(({ slot, songNo }) => (
                <li key={slot}>
                  <SongRow id={`favorite-folder-slot-${slot}`} look={look(songNo)} i18n={i18n} />
                </li>
              ))}
            </Box>
          )}
          <Button
            id="favorite-folder-save-as-set"
            variant="outlined"
            disabled={shut || songs.length === 0}
            onClick={onSaveAsSet}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("favorites.saveAsSet")}
          </Button>
          {saving === "folder" && (
            <Waiting id="favorite-folder-saving">{t("costume.saving")}</Waiting>
          )}
          {notice?.write === "folder" && (
            <WriteOutcomeNotice
              id="favorite-folder-outcome"
              kind="folder"
              outcome={notice.outcome}
              i18n={i18n}
              songName={(songNo) => look(songNo).name}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
