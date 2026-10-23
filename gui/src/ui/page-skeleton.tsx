import { Box, LinearProgress } from "@mui/material";
import type { ReactNode } from "react";

import { PAGE_HEIGHT } from "../navigation/app-frame";
import { BAR } from "./progress-bar";

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

/** A page's shape while its first read runs, a bar over it; screen readers hear what is read. */
export function PageSkeleton({
  page,
  label,
  children,
}: {
  /** The page it stands for. */
  readonly page: string;
  readonly label: string;
  readonly children: ReactNode;
}) {
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
          <LinearProgress aria-hidden sx={BAR} />
        </Box>
      </Box>
    </Box>
  );
}
