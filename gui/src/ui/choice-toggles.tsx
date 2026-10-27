import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** A toggle for each choice, one of them always chosen. */
export function ChoiceToggles<T extends string>({
  id,
  choices,
  chosen,
  onChoose,
  ...named
}: {
  /** Each choice's toggle is `<id>-<value>`. */
  readonly id: string;
  readonly choices: readonly Choice<T>[];
  readonly chosen: T;
  readonly onChoose: (next: T) => void;
  /** The group's name: the id of what names it, or a name of its own. */
  readonly "aria-labelledby"?: string;
  readonly "aria-label"?: string;
}) {
  const choose = (next: T | null) => {
    // A second press on the chosen one would leave none.
    if (next === null) {
      return;
    }

    onChoose(next);
  };
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      color="primary"
      value={chosen}
      {...named}
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
  );
}
