import { isLocale, LOCALE_NAMES, LOCALES, type Locale, type Translator } from "@abth/i18n";
import { FormControlLabel, List, ListItem, Radio, RadioGroup, SvgIcon } from "@mui/material";
import { useId } from "react";

import { SettingsSection } from "../settings/settings-section";

const SYSTEM_CHOICE = "system";

// Material's "translate" icon (Apache 2.0), inline because the icons package is not a dependency.
function TranslateIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2zm-2.62 7 1.62-4.33L19.12 17z" />
    </SvgIcon>
  );
}

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
      icon={<TranslateIcon />}
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
        sx={{ m: 0, pl: 1, pr: 2, width: 1 }}
      />
    </ListItem>
  );
}
