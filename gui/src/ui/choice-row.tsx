import { ListItem, ListItemText } from "@mui/material";
import { useId } from "react";

import { type Choice, ChoiceToggles } from "./choice-toggles";

/** A setting's row: its name and hint, and a toggle for each choice, one of them always chosen. */
export function ChoiceRow<T extends string>({
  id,
  label,
  hint,
  choices,
  chosen,
  onChoose,
  disabled = false,
}: {
  /** Each choice's toggle is `<id>-<value>`. */
  readonly id: string;
  readonly label: string;
  readonly hint?: string | undefined;
  readonly choices: readonly Choice<T>[];
  readonly chosen: T;
  readonly onChoose: (next: T) => void;
  readonly disabled?: boolean | undefined;
}) {
  const labelId = useId();
  return (
    <ListItem sx={{ flexWrap: "wrap", columnGap: 2 }}>
      <ListItemText
        primary={label}
        secondary={hint}
        slotProps={{ primary: { id: labelId } }}
        sx={{ flex: "1 1 240px" }}
      />
      <ChoiceToggles
        id={id}
        choices={choices}
        chosen={chosen}
        onChoose={onChoose}
        disabled={disabled}
        aria-labelledby={labelId}
      />
    </ListItem>
  );
}
