import { Box, Card, CardContent, Paper, Skeleton, Stack } from "@mui/material";
import type { ComponentType } from "react";

import { SongRowSkeleton } from "./favorites/song-row";
import { HistoryRowsSkeleton } from "./history/history-row";
import { COLUMN_MAX_WIDTH_PX, CostumePageSkeleton } from "./my-page/costume-page";
import { MedalCardSkeleton } from "./my-page/medal-card";
import { OverviewHeaderSkeleton } from "./my-page/overview-header";
import { ShareBlockSkeleton } from "./my-page/share-block";
import { TitlePlateSkeleton } from "./my-page/title-plate";
import { FrameTop } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import { useTouchFirst } from "./navigation/use-touch-first";
import { SearchFieldSkeleton } from "./ui/search-field";
import { SYNC_BAR_PAGE, SyncBarSkeleton } from "./ui/sync-bar";

// Centred by margins: the skeleton's box is no flex container for alignSelf to centre it in.
const COLUMN = { width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, mx: "auto" } as const;
const FIELD_PX = 56;
const HEADING = { fontSize: "1rem", lineHeight: 1.75 } as const;
const KNOW_CARDS = [...Array(6).keys()];
const FOLDER_ROWS = [...Array(8).keys()];

function SearchBand() {
  return (
    <FrameTop>
      <SearchFieldSkeleton />
    </FrameTop>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <SearchBand />
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

function HistorySkeleton() {
  return <HistoryRowsSkeleton />;
}

function ScoresSkeleton() {
  return (
    <>
      <SearchBand />
      <Stack spacing={2}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {[80, 170, 72, 64].map((width) => (
            <Skeleton
              key={width}
              variant="rounded"
              width={width}
              height={32}
              sx={{ borderRadius: 4 }}
            />
          ))}
        </Box>
        <HistoryRowsSkeleton />
      </Stack>
    </>
  );
}

function RatingSkeleton() {
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
      <Stack spacing={0.5}>
        <Skeleton width={150} sx={{ ...HEADING, mx: 2 }} />
        <HistoryRowsSkeleton />
      </Stack>
    </Stack>
  );
}

function KnowYourselfSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" width={96} height={32} sx={{ borderRadius: 4 }} />
      <Stack spacing={1.5}>
        {KNOW_CARDS.map((key) => (
          <Paper key={key} variant="outlined" sx={{ borderRadius: 2, px: 2, py: 1.5 }}>
            <Skeleton width={120} sx={HEADING} />
            <Skeleton width="70%" sx={{ fontSize: "0.875rem" }} />
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

function NameTitleSkeleton() {
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={3} sx={{ pb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <TitlePlateSkeleton />
        </Box>
        <Skeleton variant="rounded" height={FIELD_PX} />
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={FIELD_PX} />
          <Skeleton width="70%" sx={{ fontSize: "0.75rem" }} />
        </Stack>
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}

function FavoritesSkeleton() {
  // A touch screen opens the sets by a swipe, so it has no button for them.
  const touchFirst = useTouchFirst();
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={2} sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 40 }}>
          <Skeleton width={180} sx={{ fontSize: "1.25rem" }} />
          <Box sx={{ flexGrow: 1 }} />
          {!touchFirst && <Skeleton variant="circular" width={40} height={40} />}
        </Box>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton width={120} sx={HEADING} />
              <SongRowSkeleton />
              <Skeleton variant="rounded" width={96} height={36} />
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton width={140} sx={HEADING} />
                <Box sx={{ flexGrow: 1 }} />
                <Skeleton variant="rounded" width={100} height={30} />
                <Skeleton variant="rounded" width={110} height={30} />
              </Box>
              {FOLDER_ROWS.map((key) => (
                <SongRowSkeleton key={key} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}

/** Each page's shape while its first read runs; Settings reads nothing first. */
export const PAGE_SKELETONS: Readonly<Record<Exclude<Page, "settings">, ComponentType>> = {
  overview: OverviewSkeleton,
  history: HistorySkeleton,
  scores: ScoresSkeleton,
  rating: RatingSkeleton,
  knowYourself: KnowYourselfSkeleton,
  costume: CostumePageSkeleton,
  nameTitle: NameTitleSkeleton,
  favorites: FavoritesSkeleton,
};
