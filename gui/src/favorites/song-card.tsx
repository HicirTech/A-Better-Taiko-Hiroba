import type { Translator } from "@abth/i18n";
import { Box, Button, Stack } from "@mui/material";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { type DetailsOpener, SongLookRow } from "../songs/song-look-row";
import { SectionCard, TO_THE_CARD_SIDES } from "../ui/section-card";
import { SectionTitle } from "../ui/section-title";
import { StatusNote } from "../ui/status-note";
import type { ShownFavorites } from "./favorites-state";

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
    <SectionCard id="favorite-song-card">
      <SectionTitle level={3}>{t("favorites.song.heading")}</SectionTitle>
      <Stack spacing={1.5} useFlexGap>
        {songNo === null ? (
          <StatusNote id="favorite-song-none">{t("favorites.song.none")}</StatusNote>
        ) : (
          <Box sx={TO_THE_CARD_SIDES}>
            <SongLookRow
              id="favorite-song-row"
              component="div"
              look={look(songNo)}
              i18n={i18n}
              detail={ura ? t("favorites.ura") : undefined}
              scrolling
              onOpen={openDetails(songNo)}
            />
          </Box>
        )}
        <Box>
          <Button id="favorite-song-change" variant="outlined" disabled={shut} onClick={onChange}>
            {t("favorites.song.change")}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}
