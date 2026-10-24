import { createTranslator, type Locale, type Translator } from "@abth/i18n";
import { Alert } from "@mui/material";
import { useLayoutEffect, useMemo, useState } from "react";

import { App } from "./App";
import { AppFrame } from "./navigation/app-frame";
import { keepPage, keptPage } from "./navigation/pages";
import { useShownPage } from "./navigation/use-shown-page";
import { PAGE_REGISTRY } from "./pages/registry";
import { PipelinesPage } from "./pipelines-page/pipelines-page";
import type { Platform } from "./platform";
import { LanguageSetting } from "./settings/language-setting";
import { SettingsPage } from "./settings/settings-page";
import {
  forgetLocale,
  pickedLocale,
  rememberLocale,
  systemLocale,
} from "./shared/language/locale-choice";
import { showLanguage } from "./shared/language/show-language";

export function Shell({
  platform,
  onShown,
}: {
  platform: Platform | null;
  /** Called with each language the window is shown in, the first included. */
  onShown: (i18n: Translator) => void;
}) {
  const [picked, setPicked] = useState(pickedLocale);
  const [system] = useState(systemLocale);
  const locale = picked ?? system;
  const i18n = useMemo(() => createTranslator(locale), [locale]);
  useLayoutEffect(() => {
    showLanguage(i18n);
    onShown(i18n);
  }, [i18n, onShown]);
  const [page, navigate] = useShownPage(keptPage, keepPage);
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
      pages={PAGE_REGISTRY}
      {...(platform?.shell === "android" ? { back: platform.back } : {})}
      {...(platform !== null
        ? { pipelines: <PipelinesPage port={platform.port} i18n={i18n} /> }
        : {})}
    >
      {platform !== null ? (
        <App
          port={platform.port}
          link={platform.link}
          i18n={i18n}
          page={page}
          onNavigate={navigate}
          language={language}
          {...(platform.shell === "android" ? { toast: platform.toast } : {})}
        />
      ) : page === "settings" ? (
        <SettingsPage i18n={i18n} language={language} account={{ kind: "signedOut" }} />
      ) : (
        <Alert severity="info">{i18n.t("platform.unsupported")}</Alert>
      )}
    </AppFrame>
  );
}
