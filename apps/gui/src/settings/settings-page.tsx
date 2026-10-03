import type { Translator } from "@abth/i18n";
import { Button, Divider, List, ListItem, ListItemText, Paper, SvgIcon } from "@mui/material";
import { type ReactNode, useId } from "react";

import { SettingsSection } from "./settings-section";

export type AccountState =
  | { readonly kind: "checking" }
  | { readonly kind: "signedOut" }
  // A read or a write is running: Sign out waits, or the read would show the profile after it and
  // the write would end under a session that is gone.
  | { readonly kind: "reading" }
  | {
      readonly kind: "signedIn";
      readonly nickname: string | null;
      readonly onSignOut: () => void;
    };

export interface SettingsPageProps {
  readonly i18n: Translator;
  /** The language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  readonly account: AccountState;
}

// Material's "account_circle" icon (Apache 2.0), inline: the icons package is not a dependency.
function AccountIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20" />
    </SvgIcon>
  );
}

export function SettingsPage({ i18n, language, account }: SettingsPageProps) {
  const { t } = i18n;
  const headingId = useId();
  const who =
    account.kind === "checking"
      ? null
      : account.kind === "signedOut"
        ? t("settings.signedOut")
        : account.kind === "signedIn" && account.nickname !== null
          ? t("settings.signedInAs", { name: account.nickname })
          : t("settings.signedIn");
  const signOut =
    account.kind === "signedIn"
      ? { onClick: account.onSignOut }
      : account.kind === "reading"
        ? { disabled: true }
        : null;
  return (
    <Paper variant="outlined">
      {language}
      <Divider />
      <SettingsSection
        id="account"
        headingId={headingId}
        icon={<AccountIcon />}
        title={t("settings.account")}
      >
        <List disablePadding>
          <ListItem sx={{ gap: 2 }}>
            <ListItemText
              primary={who}
              secondary={t("signOut.note")}
              slotProps={{
                primary: { id: "account-who" },
                secondary: { id: "sign-out-note" },
              }}
            />
            {signOut !== null && (
              <Button id="sign-out" variant="outlined" {...signOut} sx={{ flexShrink: 0 }}>
                {t("signOut.action")}
              </Button>
            )}
          </ListItem>
        </List>
      </SettingsSection>
    </Paper>
  );
}
