import "./theme/fonts";

import { createTranslator, type Translator } from "@abth/i18n";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useKeptChoice } from "./app/use-kept-choice";
import { connectPlatform } from "./platform";
import { pageGoneReasonOf } from "./platform/desktop-window";
import { crashCodeOf } from "./shared/crash-code";
import { startingLocale } from "./shared/language/locale-choice";
import { showLanguage } from "./shared/language/show-language";
import { Shell } from "./shell";
import { APP_THEMES } from "./theme/app-theme";
import {
  type AppearanceChoice,
  keepThemeMode,
  keepThemeName,
  keptThemeMode,
  keptThemeName,
} from "./theme/appearance";
import { FollowMode } from "./theme/follow-mode";
import { ErrorBoundary } from "./ui/error-boundary";
import { WindowCrash } from "./ui/window-crash";

const initial = startingLocale();
// The in-app browser's close button reads the language shown as it opens.
let shown: Translator = createTranslator(initial);
showLanguage(shown);
const onShown = (i18n: Translator) => {
  shown = i18n;
};

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root");
}
// Loads the app's own page afresh: on the desktop, the one page its window may go to.
const reload = () => window.location.replace("/");
const crashed = (code: string) => <WindowCrash code={code} onReload={reload} i18n={shown} />;

type WindowContent = (appearance: AppearanceChoice) => ReactNode;

/** The shell, or the whole window's note when the platform or the page's process failed. */
async function windowContent(): Promise<WindowContent> {
  const gone = pageGoneReasonOf(window.location.hash);
  if (gone !== null) {
    return () => crashed(`renderer=${gone}`);
  }
  try {
    const platform = await connectPlatform({ closeLabel: () => shown.t("signIn.closeBrowser") });
    return (appearance) => (
      <ErrorBoundary fallback={(error) => crashed(crashCodeOf("window", error))}>
        <Shell platform={platform} onShown={onShown} appearance={appearance} />
      </ErrorBoundary>
    );
  } catch (error) {
    return () => crashed(crashCodeOf("platform", error));
  }
}

/** The window in the theme and the mode the device keeps, as Settings changes them. */
function ThemedWindow({ content }: { readonly content: WindowContent }) {
  const [theme, onTheme] = useKeptChoice(keptThemeName, keepThemeName);
  const [mode, onMode] = useKeptChoice(keptThemeMode, keepThemeMode);
  return (
    <ThemeProvider theme={APP_THEMES[theme]} defaultMode={mode} storageManager={null}>
      <FollowMode mode={mode} />
      <CssBaseline enableColorScheme />
      {content({ theme, mode, onTheme, onMode })}
    </ThemeProvider>
  );
}

const content = await windowContent();
createRoot(container).render(
  <StrictMode>
    <ThemedWindow content={content} />
  </StrictMode>,
);
