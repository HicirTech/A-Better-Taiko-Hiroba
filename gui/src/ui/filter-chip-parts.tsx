import { Box, Chip, Menu, type Theme } from "@mui/material";
import { type ReactNode, useState } from "react";

import { useBackCloses } from "./back-closers";
import { ArrowDropDownIcon } from "./icons";

/** The colour a choice is known by, and the text that reads on it. */
export interface FilterFill {
  readonly colour: string;
  readonly text: string | ((theme: Theme) => string);
}

/** A choice in a filter's menu; one with no fill of its own takes the theme's. */
export interface FilterOption<T> {
  readonly value: T;
  readonly label: string;
  readonly fill: FilterFill | null;
  /** Its picture, which the chip shows in place of its label once it is chosen. */
  readonly mark?: ReactNode;
}

export const THEME_FILL: FilterFill = { colour: "primary.main", text: "primary.contrastText" };
const BELOW = { vertical: "bottom", horizontal: "left" } as const;
const FROM_TOP = { vertical: "top", horizontal: "left" } as const;

const ARROWED_CHIP = {
  "& .MuiChip-label": { display: "inline-flex", alignItems: "center", pr: 0.75 },
} as const;
const MARKS = { display: "inline-flex", alignItems: "center", gap: 0.5 } as const;
const MARK = { display: "inline-flex" } as const;
// Pictures stand in the chip's middle, not on its words' baseline.
const PICTURED_CHIP = {
  "& .MuiChip-label": { display: "inline-flex", alignItems: "center" },
} as const;

export const chosenChip = ({ colour, text }: FilterFill) =>
  ({
    bgcolor: colour,
    color: text,
    fontWeight: "fontWeightBold",
    "&:hover, &.Mui-focusVisible": { bgcolor: colour, filter: "brightness(1.12)" },
    "& .MuiChip-deleteIcon, & .MuiChip-deleteIcon:hover": { color: "inherit" },
  }) as const;

/** What a chip says once something is chosen, and the colour it takes. */
export interface ChipChoice {
  readonly label: string;
  /** The choices' pictures, shown in place of the label. */
  readonly marks: ReactNode | null;
  readonly fill: FilterFill;
}

/** The choices' pictures side by side, where every one chosen has a picture. */
export const marksOf = <T,>(picked: readonly FilterOption<T>[]): ReactNode | null =>
  picked.length > 0 && picked.every((option) => option.mark !== undefined) ? (
    <Box component="span" sx={MARKS}>
      {picked.map((option) => (
        <Box component="span" key={String(option.value)} sx={MARK}>
          {option.mark}
        </Box>
      ))}
    </Box>
  ) : null;

/** A filter's chip: its name until a choice is made, then the choice; it opens its own menu. */
export function MenuChip({
  id,
  name,
  icon,
  choice,
  onClear,
  items,
}: {
  id: string;
  name: string;
  /** Shown in place of the name while nothing is chosen. */
  icon: ReactNode | undefined;
  choice: ChipChoice | null;
  /** None for a chip that always holds a choice: it keeps its arrow and has no ×. */
  onClear: (() => void) | null;
  /** The menu's items, given the way to shut it. */
  items: (close: () => void) => ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  useBackCloses(anchor !== null, close);
  const menuId = `${id}-menu`;
  const arrowed = choice === null || onClear === null;
  const shown = choice === null ? (icon ?? name) : (choice.marks ?? choice.label);
  // Pictures in place of words: the chip is named in words for screen readers.
  const pictured = choice === null ? icon !== undefined : choice.marks !== null;
  return (
    <>
      <Chip
        id={id}
        variant={choice === null ? "outlined" : "filled"}
        label={
          arrowed ? (
            <>
              {shown}
              <ArrowDropDownIcon fontSize="small" />
            </>
          ) : (
            shown
          )
        }
        {...(pictured && { "aria-label": choice === null ? name : `${name}: ${choice.label}` })}
        onClick={(event) => setAnchor(event.currentTarget)}
        onDelete={choice === null || onClear === null ? undefined : onClear}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor !== null ? menuId : undefined}
        sx={{
          ...(choice !== null && chosenChip(choice.fill)),
          ...(pictured && PICTURED_CHIP),
          ...(arrowed && ARROWED_CHIP),
        }}
      />
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={BELOW}
        transformOrigin={FROM_TOP}
        slotProps={{ list: { dense: true, "aria-label": name }, paper: { sx: { mt: 0.5 } } }}
      >
        {items(close)}
      </Menu>
    </>
  );
}
