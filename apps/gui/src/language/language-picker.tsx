import { LOCALE_NAMES, LOCALES, type Locale, type Translator } from "@abth/i18n";
import { Button, Menu, MenuItem, SvgIcon } from "@mui/material";
import { useId, useState } from "react";

/**
 * Material's "translate" icon (Apache 2.0), drawn inline: the icons package is not a dependency. It
 * marks the picker for someone who cannot read the language the app is in.
 */
function TranslateIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2zm-2.62 7 1.62-4.33L19.12 17z" />
    </SvgIcon>
  );
}

/**
 * The app bar's language picker: the language the app is in, and a menu of every language the
 * catalog carries, each named in its own language and marked with it for screen readers.
 */
export function LanguagePicker({
  locale,
  onPick,
  i18n,
}: {
  locale: Locale;
  onPick: (locale: Locale) => void;
  i18n: Translator;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const label = i18n.t("language.picker", { name: LOCALE_NAMES[locale] });
  const pick = (next: Locale) => {
    setAnchor(null);
    if (next !== locale) {
      onPick(next);
    }
  };
  return (
    <>
      <Button
        id="language-picker"
        color="inherit"
        startIcon={<TranslateIcon />}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-controls={anchor === null ? undefined : menuId}
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ textTransform: "none", flexShrink: 0 }}
      >
        <span lang={locale}>{LOCALE_NAMES[locale]}</span>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { "aria-label": label } }}
      >
        {LOCALES.map((option) => (
          <MenuItem
            key={option}
            id={`language-${option}`}
            lang={option}
            selected={option === locale}
            onClick={() => pick(option)}
          >
            {LOCALE_NAMES[option]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
