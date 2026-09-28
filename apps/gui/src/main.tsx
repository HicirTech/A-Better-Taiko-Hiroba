import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";

import { createTranslator } from "@abth/i18n";
import { Alert, CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { startingLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import { connectPlatform } from "./platform";

// Roboto is bundled, never fetched: the Android app must work without a CDN. Japanese and Chinese
// fall back to the system's own font for the language the page's `lang` names.
const theme = createTheme({ colorSchemes: { dark: true } });
const i18n = createTranslator(startingLocale());
showLanguage(i18n);

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root");
}
const platform = await connectPlatform({ closeLabel: () => i18n.t("signIn.closeBrowser") });
createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {platform === null ? (
        <Alert severity="info">{i18n.t("platform.unsupported")}</Alert>
      ) : (
        <App port={platform.port} i18n={i18n} />
      )}
    </ThemeProvider>
  </StrictMode>,
);
