import { Box, LinearProgress } from "@mui/material";
import type { ReactNode } from "react";

import { PAGE_HEIGHT } from "../navigation/app-frame";
import { BAR } from "./progress-bar";

// The middle of what the window shows of the page, however far the shapes run below it.
const OVER_THE_MIDDLE = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: `min(100%, ${PAGE_HEIGHT})`,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
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
      sx={{ position: "relative" }}
    >
      {children}
      <Box sx={OVER_THE_MIDDLE}>
        <LinearProgress aria-hidden sx={BAR} />
      </Box>
    </Box>
  );
}
