import { Box, Skeleton, Stack } from "@mui/material";

import { ReadEveryDialog } from "../scores/read-every-dialog";
import { ScoresPage } from "../scores/scores-page";
import { PlayRowsSkeleton } from "../songs/play-row";
import { EmojiEventsIcon } from "../ui/icons";
import { readScores, scoresRead } from "./model-parts";
import type { PageEntry, SkeletonProps } from "./page";
import type { EveryRead, PageModel } from "./page-model";
import { SearchBand, scoresProgress } from "./page-parts";

/** Scores' chips as a visit opens: the difficulty's icons, the stars, the sort's words, genre. */
const SCORE_CHIPS_PX = [89, 58, 140, 73];

/** Every score read again, its details too. */
const EVERY_SCORE: EveryRead = {
  can: ({ scores }) => (scores.view?.scores.length ?? 0) > 0,
  asks: true,
  read: ({ scores }) => scores.readEvery(),
};

export const SCORES_MODEL: PageModel = {
  label: "nav.scores",
  namesSongs: true,
  needsSongs: true,
  opens: ({ scores, keptSets }) => [scores.load, keptSets.reload],
  waits: ({ scores }) => scores.view === null,
  reading: scoresRead,
  readAgain: readScores,
  follows: ({ scores }) => scores,
  readsEvery: () => EVERY_SCORE,
};

function ScoresSkeleton(screen: SkeletonProps) {
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

export const SCORES_PAGE: PageEntry = {
  ...SCORES_MODEL,
  icon: <EmojiEventsIcon />,
  skeleton: ScoresSkeleton,
  progress: scoresProgress,
  askEvery: ({ scores, i18n }, open, onAnswer) => (
    <ReadEveryDialog
      open={open}
      charts={scores.view?.scores.length ?? 0}
      i18n={i18n}
      onAnswer={onAnswer}
    />
  ),
  draw: (data) => (
    <ScoresPage
      scores={data.scores}
      catalogue={data.catalogue}
      lane={data.lane}
      keptSets={data.keptSets}
      shownDifficulty={data.shownDifficulty}
      startingSort={data.startingSort}
      touchFirst={data.touchFirst}
      wide={data.wide}
      modalLook={data.modalLook}
      i18n={data.i18n}
    />
  ),
};
