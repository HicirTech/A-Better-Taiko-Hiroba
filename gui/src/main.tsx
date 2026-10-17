import "./theme/fonts";

import { createTranslator, type Translator } from "@abth/i18n";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { startingLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import { connectPlatform } from "./platform";
import { Shell } from "./shell";
import { appTheme } from "./theme/app-theme";

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
const platform = await connectPlatform({ closeLabel: () => shown.t("signIn.closeBrowser") });
createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <Shell platform={platform} onShown={onShown} />
    </ThemeProvider>
  </StrictMode>,
);
