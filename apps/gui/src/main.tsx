// Roboto is bundled, not fetched: the Android app must work without a CDN.
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

const theme = createTheme({
  colorSchemes: { dark: true },
  components: {
    // Keep the scrollbar's room on every page so the column and Fab stand still.
    // Not scrollbar-gutter: MUI's modals make up for this way alone.
    MuiCssBaseline: { styleOverrides: { html: { overflowY: "scroll" } } },
  },
});
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
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Shell platform={platform} onShown={onShown} />
    </ThemeProvider>
  </StrictMode>,
);
