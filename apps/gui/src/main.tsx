import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";

import { createTranslator, type Translator } from "@abth/i18n";
import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { startingLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import { connectPlatform } from "./platform";
import { Shell } from "./shell";

// Roboto is bundled, never fetched: the Android app must work without a CDN. Japanese and Chinese
// fall back to the system's own font for the language the page's `lang` names.
const theme = createTheme({ colorSchemes: { dark: true } });
const initial = startingLocale();
/** The language the window is in now: the in-app browser's close button reads it as it opens. */
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Shell platform={platform} onShown={onShown} />
    </ThemeProvider>
  </StrictMode>,
);
