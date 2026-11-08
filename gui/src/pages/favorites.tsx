import { Box, Skeleton, Stack } from "@mui/material";

import { FavoritesPage } from "../favorites/favorites-page";
import { SongLookRowSkeleton } from "../songs/song-look-row";
import { textSize } from "../theme/app-theme";
import { FavoriteIcon } from "../ui/icons";
import { CARD_GAP, CARD_ROWS, SectionCard, TO_THE_CARD_SIDES } from "../ui/section-card";
import { SectionTitleSkeleton } from "../ui/section-title";
import { SYNC_BAR_PAGE, SyncBarSkeleton } from "../ui/sync-bar";
import { dueFirst, readsFirst } from "./model-parts";
import type { PageEntry, SkeletonProps } from "./page";
import type { PageModel } from "./page-model";
import { COLUMN, HEADING } from "./page-parts";

const FOLDER_ROWS = [...Array(8).keys()];

export const FAVORITES_MODEL: PageModel = {
  label: "nav.favorites",
  readLabel: "favorites.reading",
  namesSongs: true,
  needsSongs: true,
  opens: ({ keptSets }) => [keptSets.reload],
  firstRead: ({ favorites, writing }) => dueFirst(favorites, writing),
  waits: ({ favorites }) => readsFirst(favorites),
  reading: ({ favorites }) => favorites.reading,
  readAgain: ({ pickable, favorites }) => {
    // The pickers' list is read again when a picker next opens.
    pickable.markStale();
    return favorites.read(true);
  },
  follows: ({ favorites }) => favorites,
  leaves: ({ favorites }) => [favorites.dropEdits],
};

function FavoritesSkeleton({ touchFirst }: SkeletonProps) {
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

export const FAVORITES_PAGE: PageEntry = {
  ...FAVORITES_MODEL,
  icon: <FavoriteIcon />,
  skeleton: FavoritesSkeleton,
  draw: (data) => (
    <FavoritesPage
      favorites={data.favorites}
      tipScene={data.tipScene === "sets" || data.tipScene === "editedSet" ? data.tipScene : null}
      catalogue={data.catalogue}
      port={data.port}
      lane={data.lane}
      pickable={data.pickable.pickable}
      onPickerOpen={data.pickable.readIfStale}
      keptSets={data.keptSets}
      touchFirst={data.touchFirst}
      menuOpen={data.menuOpen}
      pipelinesShown={data.pipelinesShown}
      shownDifficulty={data.shownDifficulty}
      chartSource={data.chartSource}
      modalLook={data.modalLook}
      profile={data.session.screen.name === "profile" ? data.session.screen.profile : null}
      share={data.share}
      i18n={data.i18n}
    />
  ),
};
