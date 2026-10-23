import { Box, LinearProgress, Typography } from "@mui/material";
import { useId } from "react";

/** How far a run has come, where it knows how far it has to go. */
export interface Done {
  readonly done: number;
  readonly total: number;
}

/** The bar's own look, short and centred, so a bar with no words of its own looks the same. */
export const BAR = {
  width: "min(240px, 60%)",
  mx: "auto",
  borderRadius: 1,
  "& .MuiLinearProgress-bar": { borderRadius: 1 },
} as const;

/** How full a bar for `progress` is, in percent: null where it moves back and forth. */
export function fillOf(progress: Done | null | undefined): number | null {
  return progress === null || progress === undefined || progress.total === 0
    ? null
    : (100 * progress.done) / progress.total;
}

/** The app's one progress bar: centred words over a bar that fills where the total is known. */
export function ProgressBar({
  id,
  label,
  progress,
}: {
  readonly id?: string | undefined;
  /** What runs, such as the page being read. */
  readonly label: string;
  /** How far it has come; without it the bar moves back and forth. */
  readonly progress?: Done | null | undefined;
}) {
  const labelId = useId();
  const value = fillOf(progress);
  return (
    <Box id={id}>
      <Typography
        id={labelId}
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.75, textAlign: "center" }}
      >
        {label}
      </Typography>
      <LinearProgress
        aria-labelledby={labelId}
        variant={value === null ? "indeterminate" : "determinate"}
        value={value ?? undefined}
        sx={BAR}
      />
    </Box>
  );
}
