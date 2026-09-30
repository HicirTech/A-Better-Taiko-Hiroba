import { createTranslator, type Locale, type Translator } from "@abth/i18n";
import { Alert } from "@mui/material";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";

import { App } from "./App";
import { LanguageSetting } from "./language/language-setting";
import { forgetLocale, pickedLocale, rememberLocale, systemLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import { AppFrame } from "./navigation/app-frame";
import { keepPage, keptPage, type Page } from "./navigation/pages";
import type { Platform } from "./platform";
import { SettingsPage } from "./settings/settings-page";

/**
 * The window: its navigation around the app, and the language, which Settings shows. A page or a
 * language picked is kept on this device, and System default forgets the pick; a language takes
 * hold at once, and the page keeps where it was and asks Hiroba nothing. `onShown` hears each
 * language the window is shown in, the first included.
 */
export function Shell({
  platform,
  onShown,
}: {
  platform: Platform | null;
  onShown: (i18n: Translator) => void;
}) {
  /** The language picked on this device, or null while the app follows the system's. */
  const [picked, setPicked] = useState(pickedLocale);
  /** The system's language, read once: it holds for the run. */
  const [system] = useState(systemLocale);
  const locale = picked ?? system;
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
  const pick = (next: Locale | null) => {
    if (next === null) {
      forgetLocale();
    } else {
      rememberLocale(next);
    }
    setPicked(next);
  };
  const language = <LanguageSetting picked={picked} system={system} onPick={pick} i18n={i18n} />;
  return (
    <AppFrame
      page={page}
      onNavigate={navigate}
      i18n={i18n}
      {...(platform?.shell === "android" ? { back: platform.back } : {})}
    >
      {platform !== null ? (
        <App
          port={platform.port}
          i18n={i18n}
          page={page}
          onNavigate={navigate}
          language={language}
        />
      ) : page === "settings" ? (
        <SettingsPage i18n={i18n} language={language} account={{ kind: "signedOut" }} />
      ) : (
        <Alert severity="info">{i18n.t("platform.unsupported")}</Alert>
      )}
    </AppFrame>
  );
}
