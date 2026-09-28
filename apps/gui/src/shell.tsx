import { createTranslator, type Locale, type Translator } from "@abth/i18n";
import { Alert } from "@mui/material";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";

import { App } from "./App";
import { LanguageSetting } from "./language/language-setting";
import { rememberLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import { AppFrame } from "./navigation/app-frame";
import { keepPage, keptPage, type Page } from "./navigation/pages";
import type { Platform } from "./platform";
import { SettingsPage } from "./settings/settings-page";

/**
 * The window: its navigation around the app, and the language, which Settings shows. A page or a
 * language picked is kept on this device; a language takes hold at once, and the page keeps where it
 * was and asks Hiroba nothing. `onShown` hears each language the window is shown in, the first
 * included.
 */
export function Shell({
  platform,
  initial,
  onShown,
}: {
  platform: Platform | null;
  initial: Locale;
  onShown: (i18n: Translator) => void;
}) {
  const [locale, setLocale] = useState(initial);
  const i18n = useMemo(() => createTranslator(locale), [locale]);
  useLayoutEffect(() => {
    showLanguage(i18n);
    onShown(i18n);
  }, [i18n, onShown]);
  const [page, setPage] = useState(keptPage);
  const navigate = useCallback((next: Page) => {
    keepPage(next);
    setPage(next);
    window.scrollTo(0, 0);
  }, []);
  const pick = (next: Locale) => {
    rememberLocale(next);
    setLocale(next);
  };
  const language = <LanguageSetting locale={locale} onPick={pick} i18n={i18n} />;
  return (
    <AppFrame page={page} onNavigate={navigate} i18n={i18n}>
      {platform !== null ? (
        <App
          port={platform.port}
          i18n={i18n}
          page={page}
          onNavigate={navigate}
          language={language}
        />
      ) : page === "settings" ? (
        <SettingsPage i18n={i18n} language={language} />
      ) : (
        <Alert severity="info">{i18n.t("platform.unsupported")}</Alert>
      )}
    </AppFrame>
  );
}
