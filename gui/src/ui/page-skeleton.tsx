import { Box, LinearProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { PAGE_HEIGHT } from "./frame-top";
import { BAR, type Done, fillOf } from "./progress-bar";

/** What a read says of itself on the skeleton's bar: its words, and how far it has come. */
export interface SkeletonProgress {
  readonly words: string;
  readonly done: Done | null;
}

const OVER_THE_SHAPES = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
} as const;
// Stuck to the window's middle, so the bar stands as high on every page, short shapes or scrolled.
const IN_THE_WINDOWS_MIDDLE = {
  position: "sticky",
  top: "50vh",
  transform: "translateY(-50%)",
} as const;
// Over the bar, out of its box, so the bar itself keeps to the middle.
const WORDS_OVER_THE_BAR = {
  position: "absolute",
  bottom: "100%",
  left: 0,
  right: 0,
  mb: 0.75,
  textAlign: "center",
} as const;

/** A page's shape while it is read, a bar over it; screen readers hear what is read. */
export function PageSkeleton({
  page,
  label,
  progress,
  children,
}: {
  /** The page it stands for. */
  readonly page: string;
  readonly label: string;
  /** What the read says of itself, where it can; the bar moves back and forth otherwise. */
  readonly progress?: SkeletonProgress | null | undefined;
  readonly children: ReactNode;
}) {
  const value = fillOf(progress?.done);
  return (
    <Box
      id="page-skeleton"
      data-page={page}
      role="status"
      aria-label={label}
      aria-busy
      sx={{ position: "relative", minHeight: PAGE_HEIGHT }}
    >
      {children}
      <Box sx={OVER_THE_SHAPES}>
        <Box sx={IN_THE_WINDOWS_MIDDLE}>
          {progress !== null && progress !== undefined && (
            <Typography
              id="page-skeleton-words"
              variant="body2"
              color="text.secondary"
              sx={WORDS_OVER_THE_BAR}
            >
              {progress.words}
            </Typography>
          )}
          <LinearProgress
            aria-hidden
            variant={value === null ? "indeterminate" : "determinate"}
            value={value ?? undefined}
            sx={BAR}
          />
        </Box>
      </Box>
    </Box>
  );
}
