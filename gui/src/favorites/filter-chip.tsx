import type { Translator } from "@abth/i18n";
import { Box, Checkbox, Chip, ListItemIcon, Menu, MenuItem, type Theme } from "@mui/material";
import { type ReactNode, useState } from "react";

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

const checkOf = (fill: FilterFill | null) =>
  fill === null ? undefined : { color: fill.colour, "&.Mui-checked": { color: fill.colour } };

/** What a chip says once something is chosen, and the colour it takes. */
interface ChipChoice {
  readonly label: string;
  readonly fill: FilterFill;
}

/** A filter's chip: its name until a choice is made, then the choice; it opens its own menu. */
function MenuChip({
  id,
  name,
  choice,
  onClear,
  items,
}: {
  id: string;
  name: string;
  choice: ChipChoice | null;
  onClear: () => void;
  /** The menu's items, given the way to shut it. */
  items: (close: () => void) => ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  useBackCloses(anchor !== null, close);
  const menuId = `${id}-menu`;
  return (
    <>
      <Chip
        id={id}
        variant={choice === null ? "outlined" : "filled"}
        label={
          choice === null ? (
            <>
              {name}
              <ArrowDropDownIcon />
            </>
          ) : (
            choice.label
          )
        }
        onClick={(event) => setAnchor(event.currentTarget)}
        onDelete={choice === null ? undefined : onClear}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor !== null ? menuId : undefined}
        sx={choice === null ? UNCHOSEN_CHIP : chosenChip(choice.fill)}
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

/** A filter's chip with one choice at most, which its menu makes and shuts on. */
export function FilterChip<T extends string | number>({
  id,
  name,
  options,
  chosen,
  i18n,
  allLabel,
  onChoose,
}: {
  id: string;
  name: string;
  options: readonly FilterOption<T>[];
  chosen: T | null;
  i18n: Translator;
  /** The menu's first item, which clears the choice; "All" unless a chip's none means another. */
  allLabel?: string;
  onChoose: (value: T | null) => void;
}) {
  const picked = options.find((option) => option.value === chosen) ?? null;
  const swatched = options.some((option) => option.fill !== null);
  const item = (value: T | null, label: string, fill: FilterFill | null, close: () => void) => (
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
    <MenuChip
      id={id}
      name={name}
      choice={picked === null ? null : { label: picked.label, fill: picked.fill ?? THEME_FILL }}
      onClear={() => onChoose(null)}
      items={(close) => [
        item(null, allLabel ?? i18n.t("picker.all"), null, close),
        ...options.map((option) => item(option.value, option.label, option.fill, close)),
      ]}
    />
  );
}

/** A filter's chip whose menu ticks any number of choices; with none ticked it leaves all in. */
export function MultiFilterChip<T extends string | number>({
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
  chosen: readonly T[];
  i18n: Translator;
  /** The choices ticked, in the menu's order. */
  onChoose: (values: readonly T[]) => void;
}) {
  const picked = options.filter((option) => chosen.includes(option.value));
  const choice: ChipChoice | null =
    picked.length === 0
      ? null
      : {
          label: picked.map((option) => option.label).join(" · "),
          // Several choices have no one colour between them: the chip takes the theme's.
          fill: (picked.length === 1 ? picked[0]?.fill : null) ?? THEME_FILL,
        };
  const toggled = (value: T) =>
    chosen.includes(value)
      ? chosen.filter((one) => one !== value)
      : options
          .map((option) => option.value)
          .filter((one) => one === value || chosen.includes(one));
  const item = (value: T | null, label: string, fill: FilterFill | null) => {
    const ticked = value === null ? chosen.length === 0 : chosen.includes(value);
    return (
      <MenuItem
        key={value ?? "all"}
        id={`${id}-${value ?? "all"}`}
        role="menuitemcheckbox"
        aria-checked={ticked}
        selected={ticked}
        onClick={() => onChoose(value === null ? [] : toggled(value))}
      >
        <ListItemIcon>
          <Checkbox
            checked={ticked}
            size="small"
            edge="start"
            tabIndex={-1}
            disableRipple
            sx={checkOf(fill)}
            slotProps={{ input: { "aria-hidden": true } }}
          />
        </ListItemIcon>
        {label}
      </MenuItem>
    );
  };
  return (
    <MenuChip
      id={id}
      name={name}
      choice={choice}
      onClear={() => onChoose([])}
      items={() => [
        item(null, i18n.t("picker.all"), null),
        ...options.map((option) => item(option.value, option.label, option.fill)),
      ]}
    />
  );
}
