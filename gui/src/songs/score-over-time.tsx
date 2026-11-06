import { chartReadings, type DatedReading } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type { ScoreView } from "../shared/session-port";
import { SubsectionTitle } from "../ui/section-title";
import { LineChart } from "../ui/time-chart";
import { CrownAndRank } from "./play-marks";

const FIRST_LINE = { display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" } as const;

/** A chart's high score over time, from what reads of scores changed; none under two readings. */
export function ScoreOverTime({
  score,
  lane,
  i18n,
}: {
  readonly score: ScoreView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}) {
  const { t, number, date } = i18n;
  const readings = useMemo(() => chartReadings(score.changes), [score.changes]);
  if (readings.length < 2) {
    return null;
  }
  return (
    <Box id="score-details-over-time">
      <SubsectionTitle>{t("scores.overTime")}</SubsectionTitle>
      <LineChart
        id="score-details-line"
        label={t("scores.overTime")}
        points={readings.map(({ fetchedAt, highScore }) => ({
          at: Date.parse(fetchedAt),
          value: highScore,
        }))}
        format={number}
        dateOf={date}
        readout={(place) => {
          const reading = readings[place];
          return reading === undefined ? null : (
            <ReadingWords reading={reading} lane={lane} i18n={i18n} />
          );
        }}
      />
    </Box>
  );
}

/** What a reading told: its score, crown and rank, and its hits where they were logged. */
function ReadingWords({
  reading,
  lane,
  i18n,
}: {
  readonly reading: DatedReading;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}) {
  const { t, number } = i18n;
  const counted = (label: string, value: number | null) =>
    value === null ? [] : [`${label} ${number(value)}`];
  const hits = [
    ...counted(t("history.good"), reading.good),
    ...counted(t("history.ok"), reading.ok),
    ...counted(t("history.bad"), reading.bad),
    ...counted(t("history.roll"), reading.drumroll),
    ...counted(t("history.combo"), reading.maxCombo),
    ...counted(t("scores.plays"), reading.stageCount),
  ];
  return (
    <>
      <Box sx={FIRST_LINE}>
        <Typography>{number(reading.highScore)}</Typography>
        <CrownAndRank
          crown={reading.crown}
          scoreRank={reading.scoreRank}
          lane={lane}
          order={1}
          i18n={i18n}
        />
      </Box>
      {hits.length > 0 && (
        <Typography variant="body2" color="textSecondary">
          {hits.join(" · ")}
        </Typography>
      )}
    </>
  );
}
