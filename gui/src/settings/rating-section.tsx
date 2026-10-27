import type { RatingSystem } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { List } from "@mui/material";
import { useId } from "react";

import { RATING_SYSTEM_NAME, RATING_SYSTEMS } from "../shared/rating-data/rating-systems";
import { LeaderboardIcon } from "../ui/icons";
import { ChoiceRow } from "./choice-row";
import { SettingsSection } from "./settings-section";

/** The rating Rating opens on. */
export function RatingSection({
  startingRating,
  i18n,
  onStartingRating,
}: {
  readonly startingRating: RatingSystem;
  readonly i18n: Translator;
  readonly onStartingRating: (next: RatingSystem) => void;
}) {
  const { t } = i18n;
  const headingId = useId();
  return (
    <SettingsSection
      id="rating-settings"
      headingId={headingId}
      icon={<LeaderboardIcon fontSize="small" />}
      title={t("settings.rating")}
    >
      <List disablePadding>
        <ChoiceRow
          id="starting-rating"
          label={t("settings.startingRating")}
          hint={t("settings.startingRatingHint")}
          choices={RATING_SYSTEMS.map((system) => ({
            value: system,
            label: t(RATING_SYSTEM_NAME[system]),
          }))}
          chosen={startingRating}
          onChoose={onStartingRating}
        />
      </List>
    </SettingsSection>
  );
}
