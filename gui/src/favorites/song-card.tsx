import type { Translator } from "@abth/i18n";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";

import { Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import type { ShownFavorites } from "./favorites-state";
import type { SongLook } from "./song-look";
import { SongRow } from "./song-row";

export interface SongCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  readonly onChange: () => void;
  readonly onSave: () => void;
  readonly onReset: () => void;
}

/** The 大好きな曲, or the one picked to replace it, with Save and Reset once one is picked. */
export function SongCard({ shown, look, i18n, onChange, onSave, onReset }: SongCardProps) {
  const { t } = i18n;
  const { view, draft, notice, shut, saving } = shown;
  const songNo = draft === null ? view.song.state.songNo : draft.songNo;
  return (
    <Card id="favorite-song-card" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500 }}>
            {t("favorites.song.heading")}
          </Typography>
          {songNo === null ? (
            <Typography id="favorite-song-none" color="text.secondary">
              {t("favorites.song.none")}
            </Typography>
          ) : (
            <SongRow id="favorite-song-row" look={look(songNo)} i18n={i18n} scrolling />
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Button id="favorite-song-change" variant="outlined" disabled={shut} onClick={onChange}>
              {t("favorites.song.change")}
            </Button>
            {draft !== null && (
              <>
                <Box sx={{ flexGrow: 1 }} />
                <Button id="favorite-song-reset" disabled={shut} onClick={onReset}>
                  {t("costume.reset")}
                </Button>
                <Button
                  id="favorite-song-save"
                  variant="contained"
                  disabled={shut}
                  onClick={onSave}
                >
                  {t("costume.save")}
                </Button>
              </>
            )}
          </Box>
          {saving === "favoriteSong" && (
            <Waiting id="favorite-song-saving">{t("costume.saving")}</Waiting>
          )}
          {notice?.write === "favoriteSong" && (
            <WriteOutcomeNotice
              id="favorite-song-outcome"
              kind="favoriteSong"
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
