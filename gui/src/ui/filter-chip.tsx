import type { Translator } from "@abth/i18n";
import { Box, Checkbox, Chip, ListItemIcon, MenuItem } from "@mui/material";
import type { ReactNode } from "react";

import {
  type ChipChoice,
  chosenChip,
  type FilterFill,
  type FilterOption,
  MenuChip,
  marksOf,
  THEME_FILL,
} from "./filter-chip-parts";

const swatchOf = (colour: string) =>
  ({ display: "block", width: 14, height: 14, borderRadius: 0.5, bgcolor: colour }) as const;

const checkOf = (fill: FilterFill | null) =>
  fill === null ? undefined : { color: fill.colour, "&.Mui-checked": { color: fill.colour } };

/** A filter's chip with one choice at most, which its menu makes and shuts on. */
export function FilterChip<T extends string | number>({
  id,
  name,
  icon,
  options,
  chosen,
  i18n,
  allLabel,
  required = false,
  onChoose,
}: {
  id: string;
  name: string;
  /** The filter's picture, shown in place of its name while nothing is chosen. */
  icon?: ReactNode;
  options: readonly FilterOption<T>[];
  chosen: T | null;
  i18n: Translator;
  /** The menu's first item, which clears the choice; "All" unless a chip's none means another. */
  allLabel?: string;
  /** A choice is always made: the menu has no first item and the chip no ×. */
  required?: boolean;
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
      icon={icon}
      choice={
        picked === null
          ? null
          : { label: picked.label, marks: marksOf([picked]), fill: picked.fill ?? THEME_FILL }
      }
      onClear={required ? null : () => onChoose(null)}
      items={(close) => [
        ...(required ? [] : [item(null, allLabel ?? i18n.t("picker.all"), null, close)]),
        ...options.map((option) => item(option.value, option.label, option.fill, close)),
      ]}
    />
  );
}

/** A filter's choices as chips side by side, one at most chosen, each switched by a click. */
export function FilterToggles<T extends string | number>({
  id,
  options,
  chosen,
  onChoose,
}: {
  id: string;
  options: readonly FilterOption<T>[];
  chosen: T | null;
  onChoose: (value: T | null) => void;
}) {
  return options.map((option) => {
    const on = option.value === chosen;
    return (
      <Chip
        key={option.value}
        id={`${id}-${option.value}`}
        label={option.label}
        variant={on ? "filled" : "outlined"}
        aria-pressed={on}
        onClick={() => onChoose(on ? null : option.value)}
        onDelete={on ? () => onChoose(null) : undefined}
        sx={on ? chosenChip(option.fill ?? THEME_FILL) : undefined}
      />
    );
  });
}

/** A filter's chip whose menu ticks any number of choices; with none ticked it leaves all in. */
export function MultiFilterChip<T extends string | number>({
  id,
  name,
  icon,
  options,
  chosen,
  i18n,
  onChoose,
}: {
  id: string;
  name: string;
  /** The filter's picture, shown in place of its name while nothing is ticked. */
  icon?: ReactNode;
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
          marks: marksOf(picked),
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
      icon={icon}
      choice={choice}
      onClear={() => onChoose([])}
      items={() => [
        item(null, i18n.t("picker.all"), null),
        ...options.map((option) => item(option.value, option.label, option.fill)),
      ]}
    />
  );
}
