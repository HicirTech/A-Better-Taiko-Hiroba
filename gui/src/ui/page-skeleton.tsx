import { Box } from "@mui/material";
import type { ReactNode } from "react";

/** A page's shape while its first read runs; screen readers hear what is read. */
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
    <Box id="page-skeleton" data-page={page} role="status" aria-label={label} aria-busy>
      {children}
    </Box>
  );
}
