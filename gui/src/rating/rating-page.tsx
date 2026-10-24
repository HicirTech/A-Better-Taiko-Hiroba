import { type ChartRating, chartKey, type RatingFigure, rateOurTaikoV1 } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { listedOf } from "../shared/scores/score-order";
import type { ScoresState } from "../shared/scores/use-scores";
import type { ScoreView } from "../shared/session-port";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { PlayRow } from "../songs/play-row";
import { ScoreDetails } from "../songs/score-details";
import { PAGE_HEIGHT } from "../ui/frame-top";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed, ReadFailureAlert } from "../ui/read-failure-alert";
import { SectionTitle } from "../ui/section-title";
import { StatusNote } from "../ui/status-note";
import { RatingRadar } from "./rating-radar";
import type { RatingDataState } from "./use-rating-data";

/** The charts the rating counts, and as many after them that could join. */
const COUNTED = 20;

const LIST = { listStyle: "none", m: 0, p: 0 } as const;
const LEAD = {
  flexShrink: 0,
  width: 64,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "center",
  "& .rating-value": { fontWeight: 700, fontSize: "1.125rem", lineHeight: 1.3 },
  "& .rating-meta": { color: "text.secondary", fontSize: "0.75rem", lineHeight: 1.35 },
} as const;

const FIGURE_LABEL: Readonly<Record<RatingFigure, MessageKey>> = {
  rating: "rating.figure.rating",
  power: "rating.figure.power",
  stamina: "rating.figure.stamina",
  speed: "rating.figure.speed",
  accuracy: "rating.figure.accuracy",
  rhythm: "rating.figure.rhythm",
  complex: "rating.figure.complex",
};

interface Formats {
  readonly figure: Intl.NumberFormat;
  readonly constant: Intl.NumberFormat;
}

/** The player's rating and skills from the kept scores, and the charts behind them. */
export function RatingPage({
  scores,
  ratingData,
  catalogue,
  lane,
  touchFirst,
  modalLook,
  i18n,
}: {
  readonly scores: ScoresState;
  readonly ratingData: RatingDataState;
  /** taiko.wiki's song list: the names in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** A touch screen: a pull reads. */
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
}) {
  const { t, locale } = i18n;
  const { view, reading, song, failure, readSong } = scores;
  const { data } = ratingData;
  const [opened, setOpened] = useState<string | null>(null);
  const formats = useMemo(
    () => ({
      figure: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      constant: new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    }),
    [locale],
  );
  const rated = useMemo(
    () => (view === null || data === null ? null : rateOurTaikoV1(view.scores, data)),
    [view, data],
  );
  const scoreOf = useMemo(
    () => new Map((view?.scores ?? []).map((score) => [chartKey(score), score])),
    [view],
  );

  const total = rated?.figures.find((figure) => figure.figure === "rating");
  const skills = (rated?.figures ?? [])
    .filter((figure) => figure.figure !== "rating")
    .map((figure) => ({ name: t(FIGURE_LABEL[figure.figure]), value: figure.value }));
  const charts = rated?.charts ?? [];
  const openedScore = opened === null ? undefined : scoreOf.get(opened);
  const settled = view !== null && !reading && failure === null;
  const list = (id: string, heading: MessageKey, shown: readonly ChartRating[]) =>
    shown.length > 0 && (
      <Box component="section" aria-labelledby={`${id}-heading`}>
        <Box sx={{ px: 1 }}>
          <SectionTitle id={`${id}-heading`}>{t(heading)}</SectionTitle>
        </Box>
        <Stack component="ul" id={id} spacing={0} sx={LIST}>
          {shown.map((chart, index) => {
            const score = scoreOf.get(chartKey(chart));
            return (
              score !== undefined && (
                <RatedRow
                  key={chartKey(chart)}
                  chart={chart}
                  score={score}
                  constant={data?.get(chart.songNo)?.get(chart.level)?.constant ?? null}
                  catalogue={catalogue}
                  lane={lane}
                  order={index}
                  formats={formats}
                  i18n={i18n}
                  onOpen={() => setOpened(chartKey(chart))}
                />
              )
            );
          })}
        </Stack>
      </Box>
    );

  return (
    <Stack spacing={2} id="rating-page" sx={{ minHeight: PAGE_HEIGHT }}>
      {failure !== null && <LoadFailed id="rating-scores-failure" failure={failure} i18n={i18n} />}
      {ratingData.failure !== null && (
        <ReadFailureAlert
          id="rating-data-failure"
          message={t("rating.dataFailed")}
          code={ratingData.failure}
          i18n={i18n}
        />
      )}
      {settled && view.scores.length === 0 && (
        <StatusNote id="rating-empty" fill>
          {t(touchFirst ? "scores.emptyPull" : "scores.emptyReadAgain")}
        </StatusNote>
      )}
      {rated !== null && view !== null && view.scores.length > 0 && charts.length === 0 && (
        <StatusNote id="rating-none" fill>
          {t("rating.noneRated")}
        </StatusNote>
      )}
      {total !== undefined && charts.length > 0 && (
        <Stack
          id="rating-summary"
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          <Typography
            id="rating-total"
            component="p"
            variant="h3"
            sx={{ fontWeight: 700, textAlign: "center", minWidth: 140 }}
          >
            {formats.figure.format(total.value)}
          </Typography>
          <RatingRadar figures={skills} format={(value) => formats.figure.format(value)} />
        </Stack>
      )}
      {list("rating-best", "rating.best", charts.slice(0, COUNTED))}
      {list("rating-next", "rating.next", charts.slice(COUNTED, COUNTED * 2))}
      <ScoreDetails
        listed={openedScore === undefined ? null : listedOf(openedScore, catalogue, locale)}
        lane={lane}
        reading={reading}
        readingSong={song !== null && song.songNo === openedScore?.songNo}
        modalLook={modalLook}
        i18n={i18n}
        onReadSong={(score) => void readSong(score)}
        onClose={() => setOpened(null)}
      />
    </Stack>
  );
}

/** A rated chart: its rating, constant and accuracy, then its row; a click opens its details. */
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
  readonly formats: Formats;
  readonly i18n: Translator;
  readonly onOpen: () => void;
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
