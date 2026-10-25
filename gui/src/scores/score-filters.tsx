import type { MessageKey, Translator } from "@abth/i18n";
import { Box, type Theme } from "@mui/material";
import type { PictureLane } from "../pictures/picture-lane";
import { SCORE_SORTS, type ScoreFilter, type ScoreSort } from "../shared/scores/score-order";
import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
  GENRE_COLOUR,
  GENRE_LABEL,
  GENRE_ORDER,
} from "../shared/song-catalogue/genre-look";
import { DIFFICULTIES, MAX_LEVEL, MIN_LEVEL } from "../shared/song-catalogue/types";
import { CourseIcon } from "../songs/course-icon";
import { FilterChip, MultiFilterChip } from "../ui/filter-chip";
import { SortIcon, StarIcon } from "../ui/icons";

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, index) => MIN_LEVEL + index);
const MARK_PX = 20;
// One row that slides sideways where the window is too narrow for it.
const ROW = {
  display: "flex",
  gap: 1,
  overflowX: "auto",
  scrollbarWidth: "none",
  "& > *": { flexShrink: 0 },
} as const;

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
  lane,
  i18n,
  onFilter,
  onSort,
}: {
  readonly filter: ScoreFilter;
  readonly sort: ScoreSort | null;
  /** For the difficulties' icons. */
  readonly lane: PictureLane;
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
  const difficulties = DIFFICULTIES.map((difficulty, order) => ({
    value: difficulty,
    label: t(DIFFICULTY_LABEL[difficulty]),
    fill: { colour: DIFFICULTY_COLOUR[difficulty], text: DIFFICULTY_TEXT },
    mark: <CourseIcon difficulty={difficulty} lane={lane} order={order} px={MARK_PX} />,
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
        icon={<StarIcon fontSize="small" />}
        options={stars}
        chosen={filter.stars}
        i18n={i18n}
        onChoose={(chosen) => onFilter({ stars: chosen })}
      />
      <FilterChip
        id="scores-sort"
        name={t("scores.sort")}
        icon={<SortIcon fontSize="small" />}
        options={sorts}
        chosen={sort}
        i18n={i18n}
        allLabel={t("scores.sort.name")}
        onChoose={onSort}
      />
    </Box>
  );
}
