import { createTranslator, type Locale, type Translator } from "@abth/i18n";
import { useLayoutEffect, useMemo, useState } from "react";

import { App } from "./App";
import { useKeptChoice } from "./app/use-kept-choice";
import { AppFrame } from "./navigation/app-frame";
import { keepPage, keptPage } from "./navigation/pages";
import { useShownPage } from "./navigation/use-shown-page";
import { PAGE_REGISTRY } from "./pages/registry";
import { PipelinesPage } from "./pipelines-page/pipelines-page";
import type { Platform } from "./platform";
import { AppearanceSection } from "./settings/appearance-section";
import { LanguageSetting } from "./settings/language-setting";
import { SettingsPage } from "./settings/settings-page";
import {
  forgetLocale,
  pickedLocale,
  rememberLocale,
  systemLocale,
} from "./shared/language/locale-choice";
import { showLanguage } from "./shared/language/show-language";
import { keepChartSource, keptChartSource } from "./shared/song-catalogue/chart-source";
import { keepShownDifficulty, keptShownDifficulty } from "./shared/song-catalogue/shown-difficulty";
import type { AppearanceChoice } from "./theme/appearance";
import { NoteAlert } from "./ui/note-alert";
import { useTouchFirst } from "./ui/use-touch-first";
import { useWideWindow } from "./ui/use-wide-window";

export function Shell({
  platform,
  onShown,
  appearance,
}: {
  platform: Platform | null;
  /** Called with each language the window is shown in, the first included. */
  onShown: (i18n: Translator) => void;
  /** The theme and the mode, held where the window takes its theme. */
  appearance: AppearanceChoice;
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
  const wide = useWideWindow();
  const touchFirst = useTouchFirst();
  // Settings' two choices, for the page drawn here where no app runs.
  const [shownDifficulty, onShownDifficulty] = useKeptChoice(
    keptShownDifficulty,
    keepShownDifficulty,
  );
  const [chartSource, onChartSource] = useKeptChoice(keptChartSource, keepChartSource);
  const pick = (next: Locale | null) => {
    if (next === null) {
      forgetLocale();
    } else {
      rememberLocale(next);
    }
    setPicked(next);
  };
  const language = <LanguageSetting picked={picked} system={system} onPick={pick} i18n={i18n} />;
  const appearanceSection = <AppearanceSection {...appearance} i18n={i18n} />;
  return (
    <AppFrame
      page={page}
      onNavigate={navigate}
      i18n={i18n}
      wide={wide}
      touchFirst={touchFirst}
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
          appearance={appearanceSection}
          {...(platform.shell === "android" ? { toast: platform.toast } : {})}
        />
      ) : page === "settings" ? (
        <SettingsPage
          i18n={i18n}
          language={language}
          appearance={appearanceSection}
          account={{ kind: "signedOut" }}
          shownDifficulty={shownDifficulty}
          onShownDifficulty={onShownDifficulty}
          chartSource={chartSource}
          onChartSource={onChartSource}
        />
      ) : (
        <NoteAlert>{i18n.t("platform.unsupported")}</NoteAlert>
      )}
    </AppFrame>
  );
}
