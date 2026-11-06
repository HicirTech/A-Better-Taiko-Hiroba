import {
  MAX_RATING_SNAPSHOTS,
  type PlayerFigure,
  pastRatings,
  type RatingData,
  type RatingSnapshot,
} from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import { localDayOf } from "../shared/local-day";
import type { ScoresView } from "../shared/session-port";
import { SectionTitle } from "../ui/section-title";
import { LineChart } from "../ui/time-chart";
import { type RatingFormats, ratingAndSkills } from "./rating-figures";

interface RatingPoint {
  readonly at: string;
  readonly figures: readonly PlayerFigure[];
  readonly estimated: boolean;
}

const totalOf = (figures: readonly PlayerFigure[]) =>
  figures.find(({ figure }) => figure === "rating")?.value ?? 0;

/** The kept ratings, after what the log tells of the days before them; none under two points. */
export function RatingOverTime({
  kept,
  view,
  data,
  formats,
  i18n,
}: {
  /** The ratings kept for the system shown, oldest first. */
  readonly kept: readonly RatingSnapshot[];
  readonly view: ScoresView;
  readonly data: RatingData;
  readonly formats: RatingFormats;
  readonly i18n: Translator;
}) {
  const { t, date } = i18n;
  const points = useMemo((): readonly RatingPoint[] => {
    const past =
      kept.length >= MAX_RATING_SNAPSHOTS
        ? []
        : pastRatings(
            view.scores,
            view.scores.flatMap(({ changes }) => changes),
            data,
            localDayOf,
            kept[0]?.at ?? null,
          );
    return [
      ...past.map(({ at, rating, estimated }) => ({ at, figures: rating.figures, estimated })),
      ...kept.map(({ at, figures }) => ({ at, figures, estimated: false })),
    ];
  }, [kept, view, data]);
  if (points.length < 2) {
    return null;
  }
  const format = (value: number) => formats.figure.format(value);
  return (
    <Box id="rating-over-time" sx={{ px: 1 }}>
      <SectionTitle>{t("rating.overTime")}</SectionTitle>
      <LineChart
        id="rating-line"
        label={t("rating.overTime")}
        points={points.map(({ at, figures, estimated }) => ({
          at: Date.parse(at),
          value: totalOf(figures),
          estimated,
        }))}
        format={format}
        dateOf={date}
        readout={(place) => {
          const point = points[place];
          return point === undefined ? null : (
            <>
              <Typography>{format(totalOf(point.figures))}</Typography>
              <Typography variant="body2" color="textSecondary">
                {ratingAndSkills(point, t)
                  .skills.map(({ name, value }) => `${name} ${format(value)}`)
                  .join(" · ")}
              </Typography>
            </>
          );
        }}
      />
    </Box>
  );
}
