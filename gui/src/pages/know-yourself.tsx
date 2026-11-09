import { Skeleton, Stack } from "@mui/material";

import { KnowYourselfPage } from "../know-yourself";
import { textSize } from "../theme/app-theme";
import { PsychologyIcon } from "../ui/icons";
import { CARD_GAP, SectionCard } from "../ui/section-card";
import { readScores, scoresRead } from "./model-parts";
import type { PageEntry } from "./page";
import type { PageModel } from "./page-model";
import { HEADING, scoresProgress } from "./page-parts";

const KNOW_CARDS = [...Array(6).keys()];

export const KNOW_YOURSELF_MODEL: PageModel = {
  label: "nav.knowYourself",
  readLabel: "picker.loading",
  namesSongs: true,
  needsSongs: true,
  // A song list that could not be read is read again as the page opens.
  opens: ({ scores, catalogue, keptSets }) => [
    scores.load,
    catalogue.readIfFailed,
    keptSets.reload,
  ],
  waits: ({ scores, listed, catalogue }) =>
    scores.view === null || listed === null || catalogue.state === "loading",
  reading: scoresRead,
  readAgain: readScores,
  follows: ({ scores }) => scores,
};

function KnowYourselfSkeleton() {
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

export const KNOW_YOURSELF_PAGE: PageEntry = {
  ...KNOW_YOURSELF_MODEL,
  icon: <PsychologyIcon />,
  skeleton: KnowYourselfSkeleton,
  progress: scoresProgress,
  draw: (data) => (
    <KnowYourselfPage
      scores={data.scores}
      cardOpened={data.tipScene === "knowItem"}
      listed={data.listed}
      catalogue={data.catalogue}
      lane={data.lane}
      keptSets={data.keptSets}
      shownDifficulty={data.shownDifficulty}
      touchFirst={data.touchFirst}
      toast={data.touchFirst ? data.toast : undefined}
      modalLook={data.modalLook}
      i18n={data.i18n}
    />
  ),
};
