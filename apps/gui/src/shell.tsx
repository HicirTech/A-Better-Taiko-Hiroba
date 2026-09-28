import { createTranslator, type Locale, type Translator } from "@abth/i18n";
import { Alert, AppBar, Container, Toolbar, Typography } from "@mui/material";
import { useLayoutEffect, useMemo, useState } from "react";

import { App } from "./App";
import { LanguagePicker } from "./language/language-picker";
import { rememberLocale } from "./language/locale-choice";
import { showLanguage } from "./language/show-language";
import type { Platform } from "./platform";

/**
 * The window: an app bar with the app's name and the language picker, over the app. A pick is kept
 * on this device and takes hold at once; the screen keeps where it was and asks Hiroba nothing.
 * `onShown` hears each language the window is shown in, the first included.
 */
export function Shell({
  platform,
  initial,
  onShown,
}: {
  platform: Platform | null;
  initial: Locale;
  onShown: (i18n: Translator) => void;
}) {
  const [locale, setLocale] = useState(initial);
  const i18n = useMemo(() => createTranslator(locale), [locale]);
  useLayoutEffect(() => {
    showLanguage(i18n);
    onShown(i18n);
  }, [i18n, onShown]);
  const pick = (next: Locale) => {
    rememberLocale(next);
    setLocale(next);
  };
  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1 }}>
            {i18n.t("app.title")}
          </Typography>
          <LanguagePicker locale={locale} onPick={pick} i18n={i18n} />
        </Toolbar>
      </AppBar>
      {platform === null ? (
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Alert severity="info">{i18n.t("platform.unsupported")}</Alert>
        </Container>
      ) : (
        <App port={platform.port} i18n={i18n} />
      )}
    </>
  );
}
