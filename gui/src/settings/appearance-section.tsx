import type { Translator } from "@abth/i18n";
import { List } from "@mui/material";
import { useId } from "react";

import type { AppearanceChoice } from "../theme/appearance";
import { PaletteIcon } from "../ui/icons";
import { ChoiceRow } from "./choice-row";
import { SettingsSection } from "./settings-section";

/** The theme the app wears, and whether it is light, dark or as the system is. */
export function AppearanceSection({
  theme,
  mode,
  onTheme,
  onMode,
  i18n,
}: AppearanceChoice & { readonly i18n: Translator }) {
  const { t } = i18n;
  const headingId = useId();
  return (
    <SettingsSection
      id="appearance"
      headingId={headingId}
      icon={<PaletteIcon fontSize="small" />}
      title={t("settings.appearance")}
    >
      <List disablePadding>
        <ChoiceRow
          id="theme"
          label={t("settings.theme")}
          choices={[
            { value: "default", label: t("settings.theme.default") },
            { value: "hiroba", label: t("settings.theme.hiroba") },
          ]}
          chosen={theme}
          onChoose={onTheme}
        />
        <ChoiceRow
          id="theme-mode"
          label={t("settings.mode")}
          choices={[
            { value: "system", label: t("settings.mode.system") },
            { value: "light", label: t("settings.mode.light") },
            { value: "dark", label: t("settings.mode.dark") },
          ]}
          chosen={mode}
          onChoose={onMode}
        />
      </List>
    </SettingsSection>
  );
}
