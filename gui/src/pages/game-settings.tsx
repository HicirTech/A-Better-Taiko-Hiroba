import { Box, Skeleton, Stack } from "@mui/material";

import { GameSettingsPage } from "../game-settings/game-settings-page";
import { TuneIcon } from "../ui/icons";
import { CARD_GAP, SectionCard } from "../ui/section-card";
import { SectionTitleSkeleton } from "../ui/section-title";
import { SYNC_BAR_PAGE, SyncBarSkeleton } from "../ui/sync-bar";
import { dueFirst, readsFirst } from "./model-parts";
import type { PageEntry } from "./page";
import type { PageModel } from "./page-model";
import { COLUMN } from "./page-parts";

export const GAME_SETTINGS_MODEL: PageModel = {
  label: "nav.gameSettings",
  readLabel: "gameSettings.reading",
  namesSongs: false,
  needsSongs: false,
  firstRead: ({ gameSettings, writing }) => dueFirst(gameSettings, writing),
  waits: ({ gameSettings }) => readsFirst(gameSettings),
  reading: ({ gameSettings }) => gameSettings.reading,
  readAgain: ({ gameSettings }) => gameSettings.read(true),
  follows: ({ gameSettings }) => gameSettings,
  leaves: ({ gameSettings }) => [gameSettings.dropEdits],
};

/** The page's cards by the rows each holds. */
const SKELETON_CARDS = [
  { id: "profile", rows: 2 },
  { id: "display", rows: 3 },
  { id: "play", rows: 8 },
  { id: "song-select", rows: 1 },
  { id: "by-difficulty", rows: 3 },
] as const;
const ROW_PX = 56;

function GameSettingsSkeleton() {
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={CARD_GAP} sx={{ pb: 2 }}>
        {SKELETON_CARDS.map(({ id, rows }) => (
          <SectionCard key={id}>
            <SectionTitleSkeleton width={140} />
            <Stack spacing={1}>
              {[...Array(rows).keys()].map((row) => (
                <Skeleton key={row} variant="rounded" height={ROW_PX} />
              ))}
            </Stack>
          </SectionCard>
        ))}
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}

export const GAME_SETTINGS_PAGE: PageEntry = {
  ...GAME_SETTINGS_MODEL,
  icon: <TuneIcon />,
  skeleton: GameSettingsSkeleton,
  draw: (data) => (
    <GameSettingsPage settings={data.gameSettings} busy={data.writing} i18n={data.i18n} />
  ),
};
