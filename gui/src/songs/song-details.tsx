import type { Translator } from "@abth/i18n";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  Stack,
  ToggleButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";

import { CloseIcon } from "../favorites/favorites-icons";
import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
  GENRE_COLOUR,
  GENRE_LABEL,
} from "../favorites/genre-look";
import { keptShownDifficulty } from "../favorites/shown-difficulty";
import { nameLanguage, shownName } from "../favorites/song-names";
import type { ListedSong } from "../favorites/use-song-catalogue";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { useBackCloses } from "../navigation/back-closers";
import type { HirobaSessionPort } from "../session-port";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";
import { ChartPicture } from "./chart-picture";
import { bpmText, openingChart } from "./song-facts";

const TITLE_ID = "song-details-title";

// color-mix, as a chart's colour can be a light-dark() pair, which MUI's alpha() cannot read.
const chartButton = (difficulty: Difficulty) => {
  const colour = DIFFICULTY_COLOUR[difficulty];
  return {
    px: 1.5,
    py: 0.5,
    textTransform: "none",
    fontWeight: 600,
    color: "text.primary",
    borderColor: colour,
    bgcolor: `color-mix(in srgb, ${colour} 18%, transparent)`,
    "&:hover": { bgcolor: `color-mix(in srgb, ${colour} 30%, transparent)` },
    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: colour, color: DIFFICULTY_TEXT },
  } as const;
};

export interface SongDetailsProps {
  /** The song to show; none shuts the dialog. */
  readonly song: ListedSong | null;
  readonly port: Pick<HirobaSessionPort, "readChartPicture">;
  readonly i18n: Translator;
  readonly onClose: () => void;
}

export function SongDetails({ song, port, i18n, onClose }: SongDetailsProps) {
  const narrow = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  // Kept while the dialog fades out, so it does not go blank on its way.
  const [last, setLast] = useState(song);
  if (song !== null && song !== last) {
    setLast(song);
  }
  useBackCloses(song !== null, onClose);
  return (
    <Dialog
      id="song-details"
      open={song !== null}
      onClose={onClose}
      fullScreen={narrow}
      fullWidth
      maxWidth="md"
      aria-labelledby={TITLE_ID}
    >
      {last !== null && (
        <DetailsBody key={last.songNo} song={last} port={port} i18n={i18n} onClose={onClose} />
      )}
    </Dialog>
  );
}

function otherNames(song: ListedSong, shown: string): { text: string; lang: string }[] {
  const names = [song.title, song.titleEn, song.titleZh].filter(
    (name): name is string => name !== null && name !== shown,
  );
  return [...new Set(names)].map((text) => ({ text, lang: nameLanguage(song, text) }));
}

// Its own component, so each song opens on the chart its levels and the setting choose.
function DetailsBody({
  song,
  port,
  i18n,
  onClose,
}: Omit<SongDetailsProps, "song"> & { song: ListedSong }) {
  const { t, locale } = i18n;
  const [chart, setChart] = useState(() => openingChart(song.levels, keptShownDifficulty()));
  const name = shownName(song, locale);
  const charted = DIFFICULTIES.flatMap((difficulty) => {
    const level = song.levels[difficulty];
    return level === null ? [] : [{ difficulty, level }];
  });
  const facts = chart === null ? null : song.charts[chart];
  const images = facts?.images ?? [];

  return (
    <>
      <DialogTitle id={TITLE_ID} lang={nameLanguage(song, name)} sx={{ pr: 7 }}>
        {name}
      </DialogTitle>
      <IconButton
        id="song-details-close"
        aria-label={t("picker.close")}
        onClick={onClose}
        sx={{ position: "absolute", top: 12, right: 12 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            {otherNames(song, name).map(({ text, lang }) => (
              <Typography key={text} lang={lang} variant="body2" color="text.secondary">
                {text}
              </Typography>
            ))}
            {song.artists.length > 0 && (
              <Typography id="song-details-artists" lang={HIROBA_LANG} sx={{ mt: 0.5 }}>
                {song.artists.join(", ")}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {song.genres.map((genre) => (
              <Chip
                key={genre}
                size="small"
                label={t(GENRE_LABEL[genre])}
                sx={{
                  bgcolor: GENRE_COLOUR[genre],
                  color: (theme) => theme.palette.getContrastText(GENRE_COLOUR[genre]),
                }}
              />
            ))}
            {song.bpm !== null && (
              <Typography id="song-details-bpm" variant="body2" sx={{ fontWeight: 600 }}>
                {t("song.bpm", { bpm: bpmText(song.bpm) })}
              </Typography>
            )}
          </Box>
          <Box
            role="group"
            aria-label={t("details.charts")}
            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
          >
            {charted.map(({ difficulty, level }) => (
              <ToggleButton
                key={difficulty}
                id={`song-details-chart-${difficulty}`}
                value={difficulty}
                selected={difficulty === chart}
                onChange={() => setChart(difficulty)}
                sx={chartButton(difficulty)}
              >
                {t("song.level", { difficulty: t(DIFFICULTY_LABEL[difficulty]), level })}
              </ToggleButton>
            ))}
          </Box>
          {facts !== null && (
            <Typography id="song-details-facts" variant="body2" color="text.secondary">
              {facts.maxCombo !== null && t("details.maxCombo", { count: facts.maxCombo })}
              {facts.maxCombo !== null && facts.branched && " · "}
              {facts.branched && t("details.branched")}
            </Typography>
          )}
          {chart !== null && images.length > 0 ? (
            <Stack id="song-details-pictures" spacing={1}>
              {images.map((url, index) => (
                <ChartPicture
                  key={url}
                  url={url}
                  label={t("details.picture", {
                    difficulty: t(DIFFICULTY_LABEL[chart]),
                    n: index + 1,
                    count: images.length,
                  })}
                  port={port}
                  i18n={i18n}
                />
              ))}
              <Typography variant="caption" color="text.secondary">
                {t("details.pictureCredit")}
              </Typography>
            </Stack>
          ) : (
            <FormHelperText id="song-details-no-picture" sx={{ m: 0 }}>
              {t("details.noPicture")}
            </FormHelperText>
          )}
        </Stack>
      </DialogContent>
    </>
  );
}
