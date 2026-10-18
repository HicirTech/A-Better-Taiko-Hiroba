import type { Translator } from "@abth/i18n";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";

import { StatusNote } from "../ui/status-note";
import type { ShownFavorites } from "./favorites-state";
import type { SongLook } from "./song-look";
import { type DetailsOpener, SongRow } from "./song-row";

export interface SongCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  readonly openDetails: DetailsOpener;
  readonly onChange: () => void;
}

/** The 大好きな曲, or the one picked to replace it; the page's sync bar sends the pick. */
export function SongCard({ shown, look, i18n, openDetails, onChange }: SongCardProps) {
  const { t } = i18n;
  const { view, draft, shut } = shown;
  const { songNo, ura } = draft ?? view.song.state;
  return (
    <Card id="favorite-song-card" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500 }}>
            {t("favorites.song.heading")}
          </Typography>
          {songNo === null ? (
            <StatusNote id="favorite-song-none">{t("favorites.song.none")}</StatusNote>
          ) : (
            <SongRow
              id="favorite-song-row"
              look={look(songNo)}
              i18n={i18n}
              detail={ura ? t("favorites.ura") : undefined}
              scrolling
              onOpen={openDetails(songNo)}
            />
          )}
          <Box>
            <Button id="favorite-song-change" variant="outlined" disabled={shut} onClick={onChange}>
              {t("favorites.song.change")}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
