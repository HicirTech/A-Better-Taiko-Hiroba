import { Box, Skeleton, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { VISUALLY_HIDDEN } from "./visually-hidden";

const HEADING = { 2: "h2", 3: "h3", 4: "h4" } as const;
// The gap to what a title titles, the same under every title.
const OVER_ITS_CONTENT = { mb: 1 } as const;
const WORDS = { fontWeight: "fontWeightMedium", minWidth: 0 } as const;
const SECTION_LINE = { typography: "subtitle1", ...OVER_ITS_CONTENT } as const;
const SUBSECTION_LINE = { typography: "subtitle2", ...OVER_ITS_CONTENT } as const;
const WITH_START = { ...WORDS, display: "flex", alignItems: "center", gap: 1.5 } as const;
// What follows a title shares its row, and wraps under it when the row is too narrow.
const ROW = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: 1,
  rowGap: 0.5,
} as const;

export interface TitleProps {
  /** For the section's `aria-labelledby`. */
  readonly id?: string | undefined;
  readonly level?: 2 | 3 | 4;
  /** Before the words and part of the heading, such as a settings section's icon. */
  readonly start?: ReactNode;
  /** On the title's row and not part of the heading, such as a card's chip or buttons. */
  readonly end?: ReactNode;
  readonly children: ReactNode;
}

function Title({
  id,
  level,
  start,
  end,
  children,
  variant,
  grows,
  unseen = false,
}: TitleProps & {
  readonly level: 2 | 3 | 4;
  readonly variant: "subtitle1" | "subtitle2";
  /** Whether the title takes the row's room, so what follows it stands at the row's end. */
  readonly grows: boolean;
  readonly unseen?: boolean;
}) {
  const heading = (
    <Typography
      id={id}
      component={HEADING[level]}
      variant={variant}
      sx={[
        start === undefined ? WORDS : WITH_START,
        grows && end !== undefined && { flexGrow: 1 },
        end === undefined && OVER_ITS_CONTENT,
        unseen && VISUALLY_HIDDEN,
      ]}
    >
      {start}
      {children}
    </Typography>
  );
  return end === undefined ? (
    heading
  ) : (
    <Box sx={[ROW, OVER_ITS_CONTENT]}>
      {heading}
      {end}
    </Box>
  );
}

/** A section's or a card's title, 16 px and medium, 8 px over what it titles. */
export function SectionTitle({ level = 2, ...props }: TitleProps) {
  return <Title {...props} level={level} variant="subtitle1" grows />;
}

/** A title inside a section, a card or a dialog, 14 px and medium; `end` follows its words. */
export function SubsectionTitle({
  level = 3,
  visuallyHidden = false,
  ...props
}: TitleProps & {
  /** Named for screen readers alone, as the costume's tile groups are on a narrow window. */
  readonly visuallyHidden?: boolean;
}) {
  return (
    <Title {...props} level={level} variant="subtitle2" grows={false} unseen={visuallyHidden} />
  );
}

/** A section title's shape while its page's first read runs. */
export function SectionTitleSkeleton({ width }: { readonly width: number }) {
  return <Skeleton width={width} sx={SECTION_LINE} />;
}

/** A subsection title's shape while its page's first read runs. */
export function SubsectionTitleSkeleton({ width }: { readonly width: number }) {
  return <Skeleton width={width} sx={SUBSECTION_LINE} />;
}
