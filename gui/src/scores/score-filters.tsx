import type { MessageKey, Translator } from "@abth/i18n";
import { Box, type Theme } from "@mui/material";

import { FilterChip, MultiFilterChip } from "../favorites/filter-chip";
import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
  GENRE_COLOUR,
  GENRE_LABEL,
  GENRE_ORDER,
} from "../favorites/genre-look";
import { DIFFICULTIES, MAX_LEVEL, MIN_LEVEL } from "../song-catalogue/types";
import { SCORE_SORTS, type ScoreFilter, type ScoreSort } from "./score-order";

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, index) => MIN_LEVEL + index);
const ROW = { display: "flex", flexWrap: "wrap", gap: 1 } as const;

const SORT_LABEL = {
  score: "scores.sort.score",
  rank: "scores.sort.rank",
  genre: "picker.genre",
  crown: "scores.sort.crown",
  plays: "scores.plays",
  fullCombos: "scores.fullCombos",
  clears: "scores.clears",
  recent: "scores.sort.recent",
} as const satisfies Record<ScoreSort, MessageKey>;

/** The genres, difficulties and stars the scores are narrowed to, and what they are sorted by. */
export function ScoreFilters({
  filter,
  sort,
  i18n,
  onFilter,
  onSort,
}: {
  readonly filter: ScoreFilter;
  readonly sort: ScoreSort | null;
  readonly i18n: Translator;
  readonly onFilter: (part: Partial<ScoreFilter>) => void;
  readonly onSort: (sort: ScoreSort | null) => void;
}) {
  const { t } = i18n;
  const genres = GENRE_ORDER.map((genre) => {
    const colour = GENRE_COLOUR[genre];
    const text = (theme: Theme) => theme.palette.getContrastText(colour);
    return { value: genre, label: t(GENRE_LABEL[genre]), fill: { colour, text } };
  });
  const difficulties = DIFFICULTIES.map((difficulty) => ({
    value: difficulty,
    label: t(DIFFICULTY_LABEL[difficulty]),
    fill: { colour: DIFFICULTY_COLOUR[difficulty], text: DIFFICULTY_TEXT },
  }));
  const stars = LEVELS.map((level) => ({
    value: level,
    label: t("picker.level", { level }),
    fill: null,
  }));
  const sorts = SCORE_SORTS.map((value) => ({ value, label: t(SORT_LABEL[value]), fill: null }));

  return (
    <Box sx={ROW}>
      <MultiFilterChip
        id="scores-genre"
        name={t("picker.genre")}
        options={genres}
        chosen={filter.genres}
        i18n={i18n}
        onChoose={(chosen) => onFilter({ genres: chosen })}
      />
      <MultiFilterChip
        id="scores-difficulty"
        name={t("picker.difficulty")}
        options={difficulties}
        chosen={filter.difficulties}
        i18n={i18n}
        onChoose={(chosen) => onFilter({ difficulties: chosen })}
      />
      <MultiFilterChip
        id="scores-stars"
        name={t("picker.stars")}
        options={stars}
        chosen={filter.stars}
        i18n={i18n}
        onChoose={(chosen) => onFilter({ stars: chosen })}
      />
      <FilterChip
        id="scores-sort"
        name={t("scores.sort")}
        options={sorts}
        chosen={sort}
        i18n={i18n}
        allLabel={t("scores.sort.name")}
        onChoose={onSort}
      />
    </Box>
  );
}
