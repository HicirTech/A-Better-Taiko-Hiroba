import { type ChartRating, chartKey, type OurTaikoV1Data } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import { listedOf } from "../shared/scores/score-order";
import type { ScoreView } from "../shared/session-port";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { PlayRow } from "../songs/play-row";
import { textSize } from "../theme/app-theme";
import { SectionTitle } from "../ui/section-title";
import { constantOf, type RatingFormats } from "./rating-figures";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;
const ONE_COLUMN = { ...LIST, display: "flex", flexDirection: "column" } as const;
const TWO_COLUMNS = {
  ...LIST,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: 2,
} as const;
const LEAD = {
  flexShrink: 0,
  width: 64,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "center",
  "& .rating-value": { typography: "figure" },
  "& .rating-meta": { color: "text.secondary", fontSize: textSize("caption"), lineHeight: 1.35 },
} as const;

export interface RatedListProps {
  readonly id: string;
  readonly heading: MessageKey;
  readonly charts: readonly ChartRating[];
  /** Each kept score by its chart's key. */
  readonly scoreOf: ReadonlyMap<string, ScoreView>;
  readonly data: OurTaikoV1Data | null;
  /** taiko.wiki's song list: the names in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  readonly formats: RatingFormats;
  readonly i18n: Translator;
  /** Two side by side, as a snapshot's width allows; a page lists one under another. */
  readonly columns?: 1 | 2;
  /** What a press on a chart's row opens; none leaves the rows to be read. */
  readonly onOpen?: ((chart: ChartRating) => void) | undefined;
}

/** Rated charts under their heading, each a row of its scores; none draws nothing. */
export function RatedList({
  id,
  heading,
  charts,
  scoreOf,
  data,
  catalogue,
  lane,
  formats,
  i18n,
  columns = 1,
  onOpen,
}: RatedListProps) {
  return (
    charts.length > 0 && (
      <Box component="section" aria-labelledby={`${id}-heading`}>
        <Box sx={{ px: 1 }}>
          <SectionTitle id={`${id}-heading`}>{i18n.t(heading)}</SectionTitle>
        </Box>
        <Box component="ul" id={id} sx={columns === 2 ? TWO_COLUMNS : ONE_COLUMN}>
          {charts.map((chart, index) => {
            const score = scoreOf.get(chartKey(chart));
            return (
              score !== undefined && (
                <RatedRow
                  key={chartKey(chart)}
                  chart={chart}
                  score={score}
                  constant={constantOf(data, chart)}
                  catalogue={catalogue}
                  lane={lane}
                  order={index}
                  formats={formats}
                  i18n={i18n}
                  onOpen={onOpen === undefined ? undefined : () => onOpen(chart)}
                />
              )
            );
          })}
        </Box>
      </Box>
    )
  );
}

/** A rated chart: its rating, constant and accuracy, then its row; a press opens its details. */
function RatedRow({
  chart,
  score,
  constant,
  catalogue,
  lane,
  order,
  formats,
  i18n,
  onOpen,
}: {
  readonly chart: ChartRating;
  readonly score: ScoreView;
  readonly constant: number | null;
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  readonly order: number;
  readonly formats: RatingFormats;
  readonly i18n: Translator;
  readonly onOpen: (() => void) | undefined;
}) {
  const { t, locale } = i18n;
  const listed = listedOf(score, catalogue, locale);
  return (
    <PlayRow
      play={score}
      name={{ text: listed.name, lang: listed.nameLang }}
      genres={listed.genres}
      stars={listed.stars}
      lane={lane}
      order={order}
      i18n={i18n}
      onOpen={onOpen}
      data-song-no={score.songNo}
      data-level={score.level}
      lead={
        <Box component="span" className="rating-lead" sx={LEAD}>
          <span className="rating-value">{formats.figure.format(chart.figures.rating)}</span>
          {constant !== null && (
            <span className="rating-meta">
              {t("rating.constant", { value: formats.constant.format(constant) })}
            </span>
          )}
          <span className="rating-meta">
            {t("rating.accuracy", { value: formats.figure.format(chart.accuracy * 100) })}
          </span>
        </Box>
      }
    />
  );
}
