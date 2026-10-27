import { type ChartRating, chartKey, ratePlayer } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemShare } from "../platform";
import { RATING_SYSTEMS } from "../shared/rating-data/rating-systems";
import { listedOf } from "../shared/scores/score-order";
import type { ScoresState } from "../shared/scores/use-scores";
import type { ProfileView } from "../shared/session-port";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { SnapshotButton } from "../snapshots/snapshot-button";
import { ScoreDetails } from "../songs/score-details";
import { ChoiceToggles } from "../ui/choice-toggles";
import { FrameTop, PAGE_HEIGHT } from "../ui/frame-top";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed, ReadFailureAlert } from "../ui/read-failure-alert";
import { StatusNote } from "../ui/status-note";
import { RatedList } from "./rated-list";
import {
  COUNTED,
  NONE_RATED,
  RATING_SYSTEM_SHORT,
  ratingAndSkills,
  ratingFormats,
} from "./rating-figures";
import { RatingRadar } from "./rating-radar";
import { RatingSnapshot } from "./rating-snapshot";
import type { RatingDataState } from "./use-rating-data";

const AT_THE_END = { display: "flex", justifyContent: "flex-end" } as const;

/** The player's rating and skills from the kept scores, and the charts behind them. */
export function RatingPage({
  scores,
  ratingData,
  catalogue,
  lane,
  profile,
  share,
  wide,
  touchFirst,
  modalLook,
  i18n,
}: {
  readonly scores: ScoresState;
  readonly ratingData: RatingDataState;
  /** taiko.wiki's song list: the names in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** The player my page was read for: a picture to share stands on their plate. */
  readonly profile: ProfileView | null;
  readonly share: SystemShare;
  /** The window is wide enough for the side panel. */
  readonly wide: boolean;
  /** A touch screen: a pull reads. */
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
}) {
  const { t, locale } = i18n;
  const { view, reading, song, failure, readSong } = scores;
  const { data, system } = ratingData;
  const [opened, setOpened] = useState<string | null>(null);
  const formats = useMemo(() => ratingFormats(locale, system), [locale, system]);
  const rated = useMemo(
    () => (view === null || data === null ? null : ratePlayer(view.scores, data)),
    [view, data],
  );
  const scoreOf = useMemo(
    () => new Map((view?.scores ?? []).map((score) => [chartKey(score), score])),
    [view],
  );

  const { total, skills } = ratingAndSkills(rated, t);
  const charts = rated?.charts ?? [];
  const openedScore = opened === null ? undefined : scoreOf.get(opened);
  const settled = view !== null && !reading && failure === null;
  // ISO times, so the newest is the greatest.
  const readAt = (view?.scores ?? []).reduce(
    (newest, score) => (score.fetchedAt > newest ? score.fetchedAt : newest),
    "",
  );
  const list = (id: string, heading: MessageKey, shown: readonly ChartRating[]) => (
    <RatedList
      id={id}
      heading={heading}
      charts={shown}
      scoreOf={scoreOf}
      catalogue={catalogue}
      lane={lane}
      formats={formats}
      i18n={i18n}
      onOpen={(chart) => setOpened(chartKey(chart))}
    />
  );

  return (
    <>
      <FrameTop
        wide={wide}
        touchFirst={touchFirst}
        stays={false}
        // The share's room stays while there is nothing to share, so the switch keeps its place.
        end={
          rated !== null && profile !== null && charts.length > 0 ? (
            <SnapshotButton
              id="rating-share"
              shows="abth-rating"
              share={share}
              lane={lane}
              i18n={i18n}
              snapshot={(snapshotLane) => (
                <RatingSnapshot
                  profile={profile}
                  rated={rated}
                  scoreOf={scoreOf}
                  catalogue={catalogue}
                  lane={snapshotLane}
                  readAt={readAt}
                  i18n={i18n}
                />
              )}
            />
          ) : null
        }
      >
        <Box sx={AT_THE_END}>
          <ChoiceToggles
            id="rating-system"
            aria-label={t("rating.switch")}
            choices={RATING_SYSTEMS.map((one) => ({
              value: one,
              label: t(RATING_SYSTEM_SHORT[one]),
            }))}
            chosen={system}
            onChoose={ratingData.show}
          />
        </Box>
      </FrameTop>
      <Stack spacing={2} id="rating-page" sx={{ minHeight: PAGE_HEIGHT }}>
        {failure !== null && (
          <LoadFailed id="rating-scores-failure" failure={failure} i18n={i18n} />
        )}
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
            {t(NONE_RATED[system])}
          </StatusNote>
        )}
        {total !== null && charts.length > 0 && (
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
              sx={{ fontWeight: "fontWeightBold", textAlign: "center", minWidth: 140 }}
            >
              {formats.figure.format(total)}
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
          touchFirst={touchFirst}
          modalLook={modalLook}
          i18n={i18n}
          onReadSong={(score) => void readSong(score)}
          onClose={() => setOpened(null)}
        />
      </Stack>
    </>
  );
}
