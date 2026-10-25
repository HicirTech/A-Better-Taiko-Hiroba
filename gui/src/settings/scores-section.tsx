import type { Translator } from "@abth/i18n";
import { List } from "@mui/material";
import { useId } from "react";

import { SORT_CHOICES, SORT_LABEL, type SortChoice } from "../shared/scores/score-order";
import { SortIcon } from "../ui/icons";
import { SelectRow } from "./select-row";
import { SettingsSection } from "./settings-section";

/** What Scores is sorted by as it opens. */
export function ScoresSection({
  startingSort,
  i18n,
  onStartingSort,
}: {
  readonly startingSort: SortChoice;
  readonly i18n: Translator;
  readonly onStartingSort: (next: SortChoice) => void;
}) {
  const { t } = i18n;
  const headingId = useId();
  return (
    <SettingsSection
      id="scores-settings"
      headingId={headingId}
      icon={<SortIcon fontSize="small" />}
      title={t("settings.scores")}
    >
      <List disablePadding>
        <SelectRow
          id="starting-sort"
          label={t("settings.startingSort")}
          hint={t("settings.startingSortHint")}
          choices={SORT_CHOICES.map((choice) => ({ value: choice, label: t(SORT_LABEL[choice]) }))}
          chosen={startingSort}
          onChoose={onStartingSort}
        />
      </List>
    </SettingsSection>
  );
}
