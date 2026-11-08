import { Box, Skeleton, Stack } from "@mui/material";

import { RatingPage } from "../rating";
import { PlayRowsSkeleton } from "../songs/play-row";
import { FrameTop } from "../ui/frame-top";
import { LeaderboardIcon } from "../ui/icons";
import { SectionTitleSkeleton } from "../ui/section-title";
import { readScores, scoresRead } from "./model-parts";
import type { PageEntry, SkeletonProps } from "./page";
import type { PageModel } from "./page-model";
import { scoresProgress } from "./page-parts";

/** Rating's V1 | V2 switch, as its band draws it. */
const RATING_SWITCH = { width: 84, height: 38 } as const;

export const RATING_MODEL: PageModel = {
  label: "nav.rating",
  readLabel: "rating.readingData",
  namesSongs: true,
  needsSongs: true,
  opens: ({ scores, ratingData }) => [scores.load, ratingData.load],
  waits: ({ scores, ratingData }) =>
    scores.view === null || (ratingData.data === null && ratingData.failure === null),
  reading: (state) => scoresRead(state) || state.ratingData.reading,
  readAgain: (state) => {
    readScores(state);
    void state.ratingData.read();
    return undefined;
  },
  // The button turns while the rating data is read too, but waits only for the scores.
  follows: ({ scores, ratingData }) => ({
    reading: scores.reading || ratingData.reading,
    canRead: scores.canRead,
  }),
};

function RatingSkeleton({ touchFirst, wide }: SkeletonProps) {
  return (
    <>
      {/* The switch's place and the share's, as the page's band keeps them. */}
      <FrameTop
        wide={wide}
        touchFirst={touchFirst}
        stays={false}
        end={<Skeleton variant="circular" width={40} height={40} />}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Skeleton variant="rounded" {...RATING_SWITCH} />
        </Box>
      </FrameTop>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          <Skeleton width={140} height={64} />
          <Box sx={{ display: "grid", placeItems: "center", width: 300, maxWidth: 1, height: 250 }}>
            <Skeleton variant="circular" width={200} height={200} />
          </Box>
        </Stack>
        <Box>
          <Box sx={{ px: 1 }}>
            <SectionTitleSkeleton width={150} />
          </Box>
          <PlayRowsSkeleton />
        </Box>
      </Stack>
    </>
  );
}

export const RATING_PAGE: PageEntry = {
  ...RATING_MODEL,
  icon: <LeaderboardIcon />,
  skeleton: RatingSkeleton,
  progress: scoresProgress,
  draw: (data) => (
    <RatingPage
      scores={data.scores}
      ratingData={data.ratingData}
      catalogue={data.catalogue}
      lane={data.lane}
      profile={data.session.screen.name === "profile" ? data.session.screen.profile : null}
      share={data.share}
      wide={data.wide}
      touchFirst={data.touchFirst}
      modalLook={data.modalLook}
      i18n={data.i18n}
    />
  ),
};
