import { ListItem, ListItemText, MenuItem, Select } from "@mui/material";
import { useId } from "react";
import type { Choice } from "./choice-row";

/** A setting's row: its name and hint, and a list dropping down its choices, one always chosen. */
export function SelectRow<T extends string>({
  id,
  label,
  hint,
  choices,
  chosen,
  onChoose,
}: {
  /** The list is `<id>`, each choice in it `<id>-<value>`. */
  readonly id: string;
  readonly label: string;
  readonly hint?: string | undefined;
  readonly choices: readonly Choice<T>[];
  readonly chosen: T;
  readonly onChoose: (next: T) => void;
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
      <Select
        id={id}
        labelId={labelId}
        size="small"
        value={chosen}
        onChange={(event) => onChoose(event.target.value as T)}
      >
        {choices.map((choice) => (
          <MenuItem key={choice.value} id={`${id}-${choice.value}`} value={choice.value}>
            {choice.label}
          </MenuItem>
        ))}
      </Select>
    </ListItem>
  );
}
