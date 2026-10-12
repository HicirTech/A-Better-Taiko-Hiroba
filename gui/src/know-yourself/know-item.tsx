import { Box, ButtonBase, Collapse, Paper, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

import { ArrowDropDownIcon } from "../favorites/favorites-icons";

const WORDS = { display: "block", flex: 1, minWidth: 0, textAlign: "left" } as const;
const HEAD = { display: "flex", alignItems: "center", gap: 1, width: 1, px: 2, py: 1.5 } as const;
const OPENER = {
  ...HEAD,
  borderRadius: "inherit",
  "&:hover": { bgcolor: "action.hover" },
  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
  "&[aria-expanded='true'] > .MuiSvgIcon-root": { transform: "rotate(180deg)" },
} as const;

/** A part of the page: its name and what it finds, with its details folded until it is opened. */
export function KnowItem({
  id,
  title,
  summary,
  details,
}: {
  readonly id: string;
  readonly title: string;
  /** What the part finds, in one sentence. */
  readonly summary: string;
  /** None for a part with nothing more to show. */
  readonly details: (() => ReactNode) | null;
}) {
  const [open, setOpen] = useState(false);
  const words = (
    <Box component="span" sx={WORDS}>
      <Typography
        id={`${id}-title`}
        component="span"
        variant="subtitle1"
        sx={{ display: "block", fontWeight: 500 }}
      >
        {title}
      </Typography>
      <Typography
        id={`${id}-summary`}
        component="span"
        variant="body2"
        color="text.secondary"
        sx={{ display: "block" }}
      >
        {summary}
      </Typography>
    </Box>
  );
  return (
    <Paper id={id} component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <Typography component="h2" sx={{ m: 0 }}>
        {details === null ? (
          <Box component="span" sx={HEAD}>
            {words}
          </Box>
        ) : (
          <ButtonBase
            id={`${id}-header`}
            aria-expanded={open}
            aria-controls={`${id}-content`}
            onClick={() => setOpen((now) => !now)}
            sx={OPENER}
          >
            {words}
            <ArrowDropDownIcon />
          </ButtonBase>
        )}
      </Typography>
      {details !== null && (
        <Collapse in={open} unmountOnExit>
          <Box id={`${id}-content`} sx={{ px: 2, pb: 2 }}>
            {details()}
          </Box>
        </Collapse>
      )}
    </Paper>
  );
}
