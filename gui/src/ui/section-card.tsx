import { Card, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

// Small, as a phone has little room to spare.
const PADDING = 1;
/** The room between two cards, in the theme's steps. */
export const CARD_GAP = 1;
/** Takes rows out through a card's room to its sides; a Stack round them needs useFlexGap. */
export const TO_THE_CARD_SIDES = { mx: -PADDING } as const;
/** A card's list of rows that keep their own room, as far as the card's sides. */
export const CARD_ROWS = { listStyle: "none", m: 0, p: 0, ...TO_THE_CARD_SIDES } as const;

export interface SectionCardProps {
  readonly id?: string;
  /** `section` for a part of the page that its heading names through `aria-labelledby`. */
  readonly component?: "div" | "section";
  readonly "aria-labelledby"?: string;
  readonly "aria-hidden"?: boolean;
  /** Content that reaches the card's edges and keeps its own room, such as a list of rows. */
  readonly flush?: boolean;
  readonly sx?: SxProps<Theme>;
  readonly children: ReactNode;
  readonly [data: `data-${string}`]: string | boolean | undefined;
}

/** A part of a page in a frame of its own: an outline, the theme's corners and a little room. */
export function SectionCard({
  component = "div",
  flush = false,
  sx,
  children,
  ...rest
}: SectionCardProps) {
  return (
    <Card
      variant="outlined"
      component={component}
      {...rest}
      sx={[{ p: flush ? 0 : PADDING }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Card>
  );
}
