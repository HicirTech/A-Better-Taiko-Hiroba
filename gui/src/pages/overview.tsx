import { Skeleton, Stack } from "@mui/material";

import { MedalCardSkeleton } from "../my-page/medal-card";
import { OverviewHeaderSkeleton } from "../my-page/overview-header";
import { ShareBlockSkeleton } from "../profile/share-block";
import { HomeIcon } from "../ui/icons";
import { picturesOf, readMyPage } from "./model-parts";
import { OverviewPage } from "./overview-page";
import type { PageEntry, SkeletonProps } from "./page";
import type { EveryRead, PageModel } from "./page-model";
import { askPictures, SearchBand } from "./page-parts";

/** taiko.wiki's whole song list read again, while the Overview's song search stands open. */
const SONG_LIST: EveryRead = {
  can: () => true,
  asks: false,
  read: ({ catalogue }) => catalogue.readWhole(),
};

/** What the Overview draws of Hiroba's pictures. */
const MY_PAGE_PICTURES = picturesOf([
  "myDon",
  "titlePlate",
  "scorePanel",
  "medalPlate",
  "rankIcon",
  "crownIcon",
]);

export const OVERVIEW_MODEL: PageModel = {
  label: "nav.overview",
  namesSongs: true,
  needsSongs: false,
  drawsFailure: true,
  opens: ({ keptSearches }) => [keptSearches.reload],
  waits: () => false,
  reading: ({ session }) => session.myPageInView,
  readAgain: readMyPage,
  readsEvery: ({ songSearchOpen }) => (songSearchOpen ? SONG_LIST : MY_PAGE_PICTURES),
};

function OverviewSkeleton(screen: SkeletonProps) {
  return (
    <>
      {/* The share button's place, so the field is as wide as the page's. */}
      <SearchBand {...screen} end={<Skeleton variant="circular" width={40} height={40} />} />
      <Stack spacing={3}>
        <Stack sx={{ alignItems: "center" }}>
          <OverviewHeaderSkeleton />
        </Stack>
        <Stack spacing={3}>
          <ShareBlockSkeleton items={7} />
          <ShareBlockSkeleton items={3} />
        </Stack>
        <MedalCardSkeleton />
      </Stack>
    </>
  );
}

export const OVERVIEW_PAGE: PageEntry = {
  ...OVERVIEW_MODEL,
  icon: <HomeIcon />,
  skeleton: OverviewSkeleton,
  askEvery: askPictures,
  draw: (data) => <OverviewPage data={data} />,
};
