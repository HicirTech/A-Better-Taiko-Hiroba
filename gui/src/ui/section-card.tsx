import { Box, Card, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

import { SectionTitle, type TitleProps } from "./section-title";

// Small, as a phone has little room to spare.
const PADDING = 1;
const FLUSH_HEADING_ROOM = { px: PADDING, pt: PADDING } as const;
/** The room between two cards, in the theme's steps. */
export const CARD_GAP = 1;
/** Takes rows out through a card's room to its sides; a Stack round them needs useFlexGap. */
export const TO_THE_CARD_SIDES = { mx: -PADDING } as const;
/** A card's list of rows that keep their own room, as far as the card's sides. */
export const CARD_ROWS = { listStyle: "none", m: 0, p: 0, ...TO_THE_CARD_SIDES } as const;

export interface SectionCardProps {
  readonly id?: string;
  /** The title on its first row; one with an `id` names the card, a `section` by default. */
  readonly heading?: TitleProps;
  /** `section` for a part of the page; `div` unless the heading has an `id`. */
  readonly component?: "div" | "section";
  readonly "aria-hidden"?: boolean;
  /** Content that reaches the card's edges and keeps its own room; the heading keeps the card's. */
  readonly flush?: boolean;
  readonly sx?: SxProps<Theme>;
  readonly children: ReactNode;
  readonly [data: `data-${string}`]: string | boolean | undefined;
}

/** A part of a page in a frame of its own: an outline, the theme's corners and a little room. */
export function SectionCard({
  heading,
  component = heading?.id === undefined ? "div" : "section",
  flush = false,
  sx,
  children,
  ...rest
}: SectionCardProps) {
  const title = heading === undefined ? null : <SectionTitle {...heading} />;
  return (
    <Card
      variant="outlined"
      component={component}
      aria-labelledby={heading?.id}
      {...rest}
      sx={[{ p: flush ? 0 : PADDING }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {flush && title !== null ? <Box sx={FLUSH_HEADING_ROOM}>{title}</Box> : title}
      {children}
    </Card>
  );
}
