import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

import { ArrowDropDownIcon } from "./icons";
import { SectionCard } from "./section-card";

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

/** A card of a title and one sentence, with its details folded until it is opened. */
export function FoldCard({
  id,
  title,
  summary,
  details,
  level = 2,
  end,
  opened = false,
}: {
  readonly id: string;
  readonly title: string;
  /** What the card holds, in one sentence. */
  readonly summary: string;
  /** None for a card with nothing more to show. */
  readonly details: (() => ReactNode) | null;
  /** The title's heading level: 2 on a page, 3 in a dialog. */
  readonly level?: 2 | 3;
  /** Beside the words, before the fold's arrow: a mark such as a chip. */
  readonly end?: ReactNode;
  /** Held open from outside, as a tip that tells of the card does. */
  readonly opened?: boolean;
}) {
  const [unfolded, setOpen] = useState(false);
  const open = unfolded || opened;
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  // The heading holds the title alone: inside the fold's button, the title alone names the button.
  const words = (inButton: boolean) => (
    <Box component={inButton ? "span" : "div"} sx={WORDS}>
      <Typography
        id={titleId}
        component={inButton ? "span" : `h${level}`}
        variant="subtitle1"
        sx={TITLE}
      >
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
        <Box sx={HEAD}>
          {words(false)}
          {end}
        </Box>
      ) : (
        <Typography component={`h${level}`} sx={{ m: 0 }}>
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
            {end}
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
