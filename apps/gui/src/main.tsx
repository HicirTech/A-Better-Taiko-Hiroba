import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";

import { createTranslator } from "@abth/i18n";
import { Container, CssBaseline, createTheme, ThemeProvider, Typography } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Roboto is bundled, never fetched: the Android app must work without a CDN. Japanese text falls
// back to the system's own Japanese font.
const theme = createTheme({ colorSchemes: { dark: true } });
const i18n = createTranslator("en");
document.title = i18n.t("app.title");

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root");
}
createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h5" component="h1">
          {i18n.t("app.title")}
        </Typography>
      </Container>
    </ThemeProvider>
  </StrictMode>,
);
