import type { ReactNode } from "react";

import { ReadPicturesDialog } from "../read-again/read-pictures-dialog";
import { scoresReadingProgress } from "../songs/scores-reading";
import { COLUMN_MAX_WIDTH_PX, FrameTop } from "../ui/frame-top";
import { SearchFieldSkeleton } from "../ui/search-field";
import { scoresRead } from "./model-parts";
import type { PageData, SkeletonProps } from "./page";

export const scoresProgress = (data: PageData) =>
  scoresRead(data) ? scoresReadingProgress(data.i18n, data.scores.progress, null) : null;

export const askPictures = (
  { i18n }: PageData,
  open: boolean,
  onAnswer: (confirmed: boolean) => void,
) => <ReadPicturesDialog open={open} i18n={i18n} onAnswer={onAnswer} />;

// Centred by margins: the skeleton's box is no flex container for alignSelf to centre it in.
export const COLUMN = { width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, mx: "auto" } as const;
export const HEADING = { typography: "subtitle1" } as const;

export function SearchBand({
  touchFirst,
  wide,
  end,
}: SkeletonProps & { readonly end?: ReactNode }) {
  return (
    <FrameTop wide={wide} touchFirst={touchFirst} end={end}>
      <SearchFieldSkeleton />
    </FrameTop>
  );
}
