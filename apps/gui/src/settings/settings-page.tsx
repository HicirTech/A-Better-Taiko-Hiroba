import type { Translator } from "@abth/i18n";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export interface SettingsPageProps {
  readonly i18n: Translator;
  /** The language's section, which the window that holds the language draws. */
  readonly language: ReactNode;
  /** Signs out: given while a session is open, and only then is the button there. */
  readonly onSignOut?: () => void;
}

/**
 * The Settings page: the language, then the account, with what staying signed in keeps on this
 * device. It works signed out too, with no way to sign out.
 */
export function SettingsPage({ i18n, language, onSignOut }: SettingsPageProps) {
  const { t } = i18n;
  return (
    <Stack spacing={2}>
      {language}
      <Card id="account" variant="outlined">
        <CardContent>
          <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500 }}>
              {t("settings.account")}
            </Typography>
            <Typography id="sign-out-note" variant="body2" color="text.secondary">
              {t("signOut.note")}
            </Typography>
            {onSignOut !== undefined && (
              <Button id="sign-out" variant="outlined" onClick={onSignOut}>
                {t("signOut.action")}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
