import type { Translator } from "@abth/i18n";
import { List } from "@mui/material";
import { useId } from "react";

import { DIFFICULTY_LABEL } from "../shared/song-catalogue/genre-look";
import {
  SHOWN_DIFFICULTIES,
  type ShownDifficulty,
} from "../shared/song-catalogue/shown-difficulty";
import { StarIcon } from "../ui/icons";
import { ChoiceRow } from "./choice-row";
import { SettingsSection } from "./settings-section";

/** The difficulty whose level a song shows in front, its other levels stacked behind it. */
export function SongLevelsSection({
  shown,
  i18n,
  onShown,
}: {
  readonly shown: ShownDifficulty;
  readonly i18n: Translator;
  readonly onShown: (next: ShownDifficulty) => void;
}) {
  const { t } = i18n;
  const headingId = useId();
  return (
    <SettingsSection
      id="song-levels"
      headingId={headingId}
      icon={<StarIcon fontSize="small" />}
      title={t("settings.songLevels")}
    >
      <List disablePadding>
        <ChoiceRow
          id="shown-difficulty"
          label={t("settings.shownDifficulty")}
          hint={t("settings.shownDifficultyHint")}
          choices={SHOWN_DIFFICULTIES.map((one) => ({
            value: one,
            label: t(DIFFICULTY_LABEL[one]),
          }))}
          chosen={shown}
          onChoose={onShown}
        />
      </List>
    </SettingsSection>
  );
}
