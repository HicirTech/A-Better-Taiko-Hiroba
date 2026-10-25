import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

import { ArrowDropDownIcon } from "../ui/icons";
import { SectionCard } from "../ui/section-card";

const WORDS = { display: "block", flex: 1, minWidth: 0, textAlign: "left" } as const;
const HEAD = { display: "flex", alignItems: "center", gap: 1, width: 1, px: 1, py: 1 } as const;
const TITLE = { display: "block", fontWeight: "fontWeightMedium" } as const;
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
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  // The heading holds the title alone: inside the fold's button, the title alone names the button.
  const words = (inButton: boolean) => (
    <Box component={inButton ? "span" : "div"} sx={WORDS}>
      <Typography id={titleId} component={inButton ? "span" : "h2"} variant="subtitle1" sx={TITLE}>
        {title}
      </Typography>
      <Typography
        id={summaryId}
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
    <SectionCard id={id} component="section" flush>
      {details === null ? (
        <Box sx={HEAD}>{words(false)}</Box>
      ) : (
        <Typography component="h2" sx={{ m: 0 }}>
          <ButtonBase
            id={`${id}-header`}
            aria-expanded={open}
            aria-controls={`${id}-content`}
            aria-labelledby={titleId}
            aria-describedby={summaryId}
            onClick={() => setOpen((now) => !now)}
            sx={OPENER}
          >
            {words(true)}
            <ArrowDropDownIcon fontSize="small" />
          </ButtonBase>
        </Typography>
      )}
      {details !== null && (
        <Collapse in={open} unmountOnExit>
          <Box id={`${id}-content`} sx={{ px: 1, pb: 1 }}>
            {details()}
          </Box>
        </Collapse>
      )}
    </SectionCard>
  );
}
