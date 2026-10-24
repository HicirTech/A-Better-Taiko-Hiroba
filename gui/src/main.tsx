import "./theme/fonts";

import { createTranslator, type Translator } from "@abth/i18n";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { connectPlatform } from "./platform";
import { pageGoneReasonOf } from "./platform/desktop-window";
import { crashCodeOf } from "./shared/crash-code";
import { startingLocale } from "./shared/language/locale-choice";
import { showLanguage } from "./shared/language/show-language";
import { Shell } from "./shell";
import { appTheme } from "./theme/app-theme";
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

/** The shell, or the whole window's note when the platform or the page's process failed. */
async function windowContent(): Promise<ReactNode> {
  const gone = pageGoneReasonOf(window.location.hash);
  if (gone !== null) {
    return crashed(`renderer=${gone}`);
  }
  try {
    const platform = await connectPlatform({ closeLabel: () => shown.t("signIn.closeBrowser") });
    return (
      <ErrorBoundary fallback={(error) => crashed(crashCodeOf("window", error))}>
        <Shell platform={platform} onShown={onShown} />
      </ErrorBoundary>
    );
  } catch (error) {
    return crashed(crashCodeOf("platform", error));
  }
}

const content = await windowContent();
createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      {content}
    </ThemeProvider>
  </StrictMode>,
);
