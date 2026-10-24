import type { Translator } from "@abth/i18n";
import { List, ListItem, ListItemText, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useId, useState } from "react";

import { DIFFICULTY_LABEL } from "../shared/song-catalogue/genre-look";
import {
  keepShownDifficulty,
  keptShownDifficulty,
  SHOWN_DIFFICULTIES,
  type ShownDifficulty,
} from "../shared/song-catalogue/shown-difficulty";
import { StarIcon } from "../ui/icons";
import { SettingsSection } from "./settings-section";

/** The difficulty whose level a song shows in front, its other levels stacked behind it. */
export function SongLevelsSection({ i18n }: { readonly i18n: Translator }) {
  const { t } = i18n;
  const headingId = useId();
  const labelId = useId();
  const [shown, setShown] = useState(keptShownDifficulty);
  const choose = (next: ShownDifficulty | null) => {
    // A second press on the chosen one would leave none.
    if (next === null) {
      return;
    }

    keepShownDifficulty(next);
    setShown(next);
  };
  return (
    <SettingsSection
      id="song-levels"
      headingId={headingId}
      icon={<StarIcon fontSize="small" />}
      title={t("settings.songLevels")}
    >
      <List disablePadding>
        <ListItem sx={{ flexWrap: "wrap", columnGap: 2 }}>
          <ListItemText
            primary={t("settings.shownDifficulty")}
            secondary={t("settings.shownDifficultyHint")}
            slotProps={{ primary: { id: labelId } }}
            sx={{ flex: "1 1 240px" }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={shown}
            aria-labelledby={labelId}
            onChange={(_event, next: ShownDifficulty | null) => choose(next)}
          >
            {SHOWN_DIFFICULTIES.map((one) => (
              <ToggleButton
                key={one}
                id={`shown-difficulty-${one}`}
                value={one}
                sx={{ px: 1.5, textTransform: "none" }}
              >
                {t(DIFFICULTY_LABEL[one])}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </ListItem>
      </List>
    </SettingsSection>
  );
}
