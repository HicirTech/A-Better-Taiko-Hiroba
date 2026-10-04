import type { Genre } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { alpha, Box, type Theme, ToggleButton } from "@mui/material";

import { GENRE_COLOUR, GENRE_LABEL, GENRE_ORDER } from "./genre-look";

const GRID = {
  display: "grid",
  gridTemplateColumns: { xs: "repeat(4, 1fr)", md: "repeat(8, 1fr)" },
  gap: 0.75,
} as const;

const buttonOf = (genre: Genre) => {
  const colour = GENRE_COLOUR[genre];
  const text = (theme: Theme) => theme.palette.getContrastText(colour);
  return {
    minHeight: 44,
    px: 0.5,
    py: 0.75,
    fontSize: "0.75rem",
    lineHeight: 1.2,
    textTransform: "none",
    color: "text.primary",
    bgcolor: alpha(colour, 0.22),
    borderColor: colour,
    "&:hover": { bgcolor: alpha(colour, 0.36) },
    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: colour, color: text, fontWeight: 700 },
  } as const;
};

/** The genres in the game's order, each in its colour; none is chosen while a search runs. */
export function GenreGrid({
  chosen,
  i18n,
  onChoose,
}: {
  chosen: Genre | null;
  i18n: Translator;
  onChoose: (genre: Genre) => void;
}) {
  const { t } = i18n;
  return (
    <Box role="group" aria-label={t("picker.genres")} sx={GRID}>
      {GENRE_ORDER.map((genre) => (
        <ToggleButton
          key={genre}
          id={`song-picker-genre-${genre}`}
          data-genre={genre}
          value={genre}
          selected={genre === chosen}
          onChange={() => onChoose(genre)}
          sx={buttonOf(genre)}
        >
          {t(GENRE_LABEL[genre])}
        </ToggleButton>
      ))}
    </Box>
  );
}
