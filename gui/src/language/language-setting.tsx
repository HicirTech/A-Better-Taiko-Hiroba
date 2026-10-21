import { isLocale, LOCALE_NAMES, LOCALES, type Locale, type Translator } from "@abth/i18n";
import { FormControlLabel, List, ListItem, Radio, RadioGroup } from "@mui/material";
import { useId } from "react";

import { SettingsSection } from "../settings/settings-section";
import { TranslateIcon } from "../ui/icons";

const SYSTEM_CHOICE = "system";

// `onPick(null)` follows the system; picking the language the system gives is a choice of its own,
// so it is kept when the system's changes.
export function LanguageSetting({
  picked,
  system,
  onPick,
  i18n,
}: {
  picked: Locale | null;
  system: Locale;
  onPick: (next: Locale | null) => void;
  i18n: Translator;
}) {
  const headingId = useId();
  const pick = (value: string) => {
    if (value === SYSTEM_CHOICE) {
      onPick(null);
    } else if (isLocale(value)) {
      onPick(value);
    }
  };
  return (
    <SettingsSection
      id="language-setting"
      headingId={headingId}
      icon={<TranslateIcon fontSize="small" />}
      title={i18n.t("settings.language")}
    >
      <RadioGroup
        aria-labelledby={headingId}
        value={picked ?? SYSTEM_CHOICE}
        onChange={(_event, value) => pick(value)}
      >
        <List disablePadding>
          <LanguageChoice
            id="language-system"
            value={SYSTEM_CHOICE}
            label={i18n.t("language.system", { name: LOCALE_NAMES[system] })}
          />
          {LOCALES.map((option) => (
            <LanguageChoice
              key={option}
              id={`language-${option}`}
              value={option}
              label={LOCALE_NAMES[option]}
              lang={option}
            />
          ))}
        </List>
      </RadioGroup>
    </SettingsSection>
  );
}

function LanguageChoice({
  id,
  value,
  label,
  lang,
}: {
  id: string;
  value: string;
  label: string;
  lang?: Locale;
}) {
  return (
    <ListItem disablePadding>
      <FormControlLabel
        id={id}
        value={value}
        control={<Radio />}
        label={label}
        {...(lang === undefined ? {} : { lang })}
        sx={{ m: 0, pl: 0, pr: 1, width: 1 }}
      />
    </ListItem>
  );
}
