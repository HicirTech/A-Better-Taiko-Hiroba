import { ListItem, ListItemText, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useId } from "react";

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** A setting's row: its name and hint, and a toggle for each choice, one of them always chosen. */
export function ChoiceRow<T extends string>({
  id,
  label,
  hint,
  choices,
  chosen,
  onChoose,
}: {
  /** Each choice's toggle is `<id>-<value>`. */
  readonly id: string;
  readonly label: string;
  readonly hint?: string | undefined;
  readonly choices: readonly Choice<T>[];
  readonly chosen: T;
  readonly onChoose: (next: T) => void;
}) {
  const labelId = useId();
  const choose = (next: T | null) => {
    // A second press on the chosen one would leave none.
    if (next === null) {
      return;
    }

    onChoose(next);
  };
  return (
    <ListItem sx={{ flexWrap: "wrap", columnGap: 2 }}>
      <ListItemText
        primary={label}
        secondary={hint}
        slotProps={{ primary: { id: labelId } }}
        sx={{ flex: "1 1 240px" }}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={chosen}
        aria-labelledby={labelId}
        onChange={(_event, next: T | null) => choose(next)}
      >
        {choices.map((choice) => (
          <ToggleButton
            key={choice.value}
            id={`${id}-${choice.value}`}
            value={choice.value}
            sx={{ px: 1.5, textTransform: "none" }}
          >
            {choice.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </ListItem>
  );
}
