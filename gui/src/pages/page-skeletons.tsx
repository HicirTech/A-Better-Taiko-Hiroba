import { Box, Skeleton, Stack } from "@mui/material";
import { MedalCardSkeleton } from "../my-page/medal-card";
import { OverviewHeaderSkeleton } from "../my-page/overview-header";
import { ShareBlockSkeleton } from "../profile/share-block";
import { TitlePlateSkeleton } from "../profile/title-plate";
import { PlayRowsSkeleton } from "../songs/play-row";
import { SongLookRowSkeleton } from "../songs/song-look-row";
import { textSize } from "../theme/app-theme";
import { COLUMN_MAX_WIDTH_PX, FrameTop } from "../ui/frame-top";
import { SearchFieldSkeleton } from "../ui/search-field";
import { CARD_GAP, CARD_ROWS, SectionCard, TO_THE_CARD_SIDES } from "../ui/section-card";
import { SectionTitleSkeleton } from "../ui/section-title";
import { SYNC_BAR_PAGE, SyncBarSkeleton } from "../ui/sync-bar";
import type { SkeletonProps } from "./page";

// Centred by margins: the skeleton's box is no flex container for alignSelf to centre it in.
const COLUMN = { width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, mx: "auto" } as const;
const FIELD_PX = 56;
const HEADING = { typography: "subtitle1" } as const;
const KNOW_CARDS = [...Array(6).keys()];
/** Scores' chips as a visit opens: the difficulty's icons, the stars, the sort's words, genre. */
const SCORE_CHIPS_PX = [89, 58, 140, 73];
const FOLDER_ROWS = [...Array(8).keys()];

function SearchBand({ touchFirst, wide }: SkeletonProps) {
  return (
    <FrameTop wide={wide} touchFirst={touchFirst}>
      <SearchFieldSkeleton />
    </FrameTop>
  );
}

export function OverviewSkeleton(screen: SkeletonProps) {
  return (
    <>
      <SearchBand {...screen} />
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

export function ScoresSkeleton(screen: SkeletonProps) {
  return (
    <>
      <SearchBand {...screen} />
      <Stack spacing={2}>
        <Box sx={{ display: "flex", gap: 1, overflow: "hidden", "& > *": { flexShrink: 0 } }}>
          {SCORE_CHIPS_PX.map((width) => (
            <Skeleton
              key={width}
              variant="rounded"
              width={width}
              height={32}
              sx={{ borderRadius: 4 }}
            />
          ))}
        </Box>
        <PlayRowsSkeleton />
      </Stack>
    </>
  );
}

export function RatingSkeleton() {
  return (
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
  );
}

export function KnowYourselfSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" width={96} height={32} sx={{ borderRadius: 4 }} />
      <Stack spacing={CARD_GAP}>
        {KNOW_CARDS.map((key) => (
          <SectionCard key={key}>
            <Skeleton width={120} sx={HEADING} />
            <Skeleton width="70%" sx={{ fontSize: textSize("body2") }} />
          </SectionCard>
        ))}
      </Stack>
    </Stack>
  );
}

export function NameTitleSkeleton() {
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={3} sx={{ pb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <TitlePlateSkeleton />
        </Box>
        <Skeleton variant="rounded" height={FIELD_PX} />
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={FIELD_PX} />
          <Skeleton width="70%" sx={{ fontSize: textSize("caption") }} />
        </Stack>
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}

export function FavoritesSkeleton({ touchFirst }: SkeletonProps) {
  // A touch screen opens the sets by a swipe, so it has no button for them.
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={2} sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 40 }}>
          <Skeleton width={180} sx={{ fontSize: textSize("h6") }} />
          <Box sx={{ flexGrow: 1 }} />
          {!touchFirst && <Skeleton variant="circular" width={40} height={40} />}
        </Box>
        <Stack spacing={CARD_GAP}>
          <SectionCard>
            <SectionTitleSkeleton width={120} />
            <Stack spacing={1.5} useFlexGap>
              <Box sx={TO_THE_CARD_SIDES}>
                <SongLookRowSkeleton component="div" />
              </Box>
              <Skeleton variant="rounded" width={96} height={36} />
            </Stack>
          </SectionCard>
          <SectionCard>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Skeleton width={140} sx={HEADING} />
              <Box sx={{ flexGrow: 1 }} />
              <Skeleton variant="rounded" width={100} height={30} />
              <Skeleton variant="rounded" width={110} height={30} />
            </Box>
            <Box component="ul" sx={CARD_ROWS}>
              {FOLDER_ROWS.map((key) => (
                <SongLookRowSkeleton key={key} />
              ))}
            </Box>
          </SectionCard>
        </Stack>
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}
