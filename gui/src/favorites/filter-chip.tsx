import type { Translator } from "@abth/i18n";
import { Box, Chip, ListItemIcon, Menu, MenuItem, type Theme } from "@mui/material";
import { useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import { ArrowDropDownIcon } from "./favorites-icons";

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
}

const THEME_FILL: FilterFill = { colour: "primary.main", text: "primary.contrastText" };
const BELOW = { vertical: "bottom", horizontal: "left" } as const;
const FROM_TOP = { vertical: "top", horizontal: "left" } as const;

const UNCHOSEN_CHIP = {
  "& .MuiChip-label": { display: "inline-flex", alignItems: "center", pr: 0.75 },
} as const;

const chosenChip = ({ colour, text }: FilterFill) =>
  ({
    bgcolor: colour,
    color: text,
    fontWeight: 700,
    "&:hover, &.Mui-focusVisible": { bgcolor: colour, filter: "brightness(1.12)" },
    "& .MuiChip-deleteIcon, & .MuiChip-deleteIcon:hover": { color: "inherit" },
  }) as const;

const swatchOf = (colour: string) =>
  ({ display: "block", width: 14, height: 14, borderRadius: 0.5, bgcolor: colour }) as const;

/** A filter's chip: its name until a choice is made, then the choice; it opens its own menu. */
export function FilterChip<T extends string | number>({
  id,
  name,
  options,
  chosen,
  i18n,
  onChoose,
}: {
  id: string;
  name: string;
  options: readonly FilterOption<T>[];
  chosen: T | null;
  i18n: Translator;
  onChoose: (value: T | null) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  useBackCloses(anchor !== null, close);
  const menuId = `${id}-menu`;
  const picked = options.find((option) => option.value === chosen) ?? null;
  const swatched = options.some((option) => option.fill !== null);
  const item = (value: T | null, label: string, fill: FilterFill | null) => (
    <MenuItem
      key={value ?? "all"}
      id={`${id}-${value ?? "all"}`}
      role="menuitemradio"
      aria-checked={value === chosen}
      selected={value === chosen}
      onClick={() => {
        onChoose(value);
        close();
      }}
    >
      {swatched && (
        <ListItemIcon>
          {fill !== null && <Box component="span" sx={swatchOf(fill.colour)} />}
        </ListItemIcon>
      )}
      {label}
    </MenuItem>
  );

  return (
    <>
      <Chip
        id={id}
        variant={picked === null ? "outlined" : "filled"}
        label={
          picked === null ? (
            <>
              {name}
              <ArrowDropDownIcon />
            </>
          ) : (
            picked.label
          )
        }
        onClick={(event) => setAnchor(event.currentTarget)}
        onDelete={picked === null ? undefined : () => onChoose(null)}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor !== null ? menuId : undefined}
        sx={picked === null ? UNCHOSEN_CHIP : chosenChip(picked.fill ?? THEME_FILL)}
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
        {item(null, i18n.t("picker.all"), null)}
        {options.map((option) => item(option.value, option.label, option.fill))}
      </Menu>
    </>
  );
}
