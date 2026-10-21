import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

// Short enough to read as one centred block, wide enough for the longest note on one or two lines.
const WORDS_MAX_PX = 480;

const IN_PLACE = { display: "flex", justifyContent: "center", py: 2 } as const;
const FILLS = {
  ...IN_PLACE,
  flexGrow: 1,
  alignItems: "center",
  // A column that gives no height of its own still leaves the words some room.
  minHeight: 120,
} as const;

/** A grey note in a page: why there is nothing to show here, or what the last read found. */
export function StatusNote({
  id,
  fill = false,
  children,
}: {
  readonly id?: string | undefined;
  /** Fills what is left of its column, the words in its middle, as a page with nothing does. */
  readonly fill?: boolean | undefined;
  readonly children: ReactNode;
}) {
  return (
    <Box id={id} sx={fill ? FILLS : IN_PLACE}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: WORDS_MAX_PX, textAlign: "center" }}
      >
        {children}
      </Typography>
    </Box>
  );
}
