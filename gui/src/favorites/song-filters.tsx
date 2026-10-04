import type { Translator } from "@abth/i18n";
import { Box, type Theme } from "@mui/material";

import { DIFFICULTIES, MAX_LEVEL, MIN_LEVEL } from "../song-catalogue/types";
import { FilterChip } from "./filter-chip";
import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
  GENRE_COLOUR,
  GENRE_LABEL,
  GENRE_ORDER,
} from "./genre-look";
import type { SongFilter } from "./song-filter";

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, index) => MIN_LEVEL + index);
const ROW = { display: "flex", flexWrap: "wrap", gap: 1 } as const;

/** The genre, chart and star level the picker narrows its songs to, each from its own menu. */
export function SongFilters({
  filter,
  i18n,
  onFilter,
}: {
  filter: SongFilter;
  i18n: Translator;
  onFilter: (part: Partial<SongFilter>) => void;
}) {
  const { t } = i18n;
  const genres = GENRE_ORDER.map((genre) => {
    const colour = GENRE_COLOUR[genre];
    const text = (theme: Theme) => theme.palette.getContrastText(colour);
    return { value: genre, label: t(GENRE_LABEL[genre]), fill: { colour, text } };
  });
  const charts = DIFFICULTIES.map((chart) => ({
    value: chart,
    label: t(DIFFICULTY_LABEL[chart]),
    fill: { colour: DIFFICULTY_COLOUR[chart], text: DIFFICULTY_TEXT },
  }));
  const levels = LEVELS.map((level) => ({
    value: level,
    label: t("picker.level", { level }),
    fill: null,
  }));

  return (
    <Box sx={ROW}>
      <FilterChip
        id="song-picker-genre"
        name={t("picker.genre")}
        options={genres}
        chosen={filter.genre}
        i18n={i18n}
        onChoose={(genre) => onFilter({ genre })}
      />
      <FilterChip
        id="song-picker-difficulty"
        name={t("picker.difficulty")}
        options={charts}
        chosen={filter.difficulty}
        i18n={i18n}
        onChoose={(difficulty) => onFilter({ difficulty })}
      />
      <FilterChip
        id="song-picker-level"
        name={t("picker.stars")}
        options={levels}
        chosen={filter.level}
        i18n={i18n}
        onChoose={(level) => onFilter({ level })}
      />
    </Box>
  );
}
