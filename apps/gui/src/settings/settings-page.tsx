import type { Translator } from "@abth/i18n";
import { Button, Divider, List, ListItem, ListItemText, Paper, SvgIcon } from "@mui/material";
import { type ReactNode, useId } from "react";

import { SettingsSection } from "./settings-section";

/** The session open now, as the account's section shows it. */
export interface SignedInAccount {
  /** The nickname my page gave, or null while no read has given one this session. */
  readonly nickname: string | null;
  readonly onSignOut: () => void;
}

export interface SettingsPageProps {
  readonly i18n: Translator;
  /** The language's section, which the window that holds the language draws. */
  readonly language: ReactNode;
  /** Given while a session is open, and only then is there a way to sign out. */
  readonly account?: SignedInAccount;
}

/**
 * Material's "account_circle" icon (Apache 2.0), drawn inline: the icons package is not a
 * dependency. It marks the account's section as the translate icon marks the language's.
 */
function AccountIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20" />
    </SvgIcon>
  );
}

/**
 * The Settings page, laid out as Gmail's settings are: sections with small headings, each setting
 * one row with its name, a line on it where one helps, and its control. The language first, then
 * the account: who is signed in, and signing out, with what staying signed in keeps on this
 * device. It works signed out too, with no way to sign out.
 */
export function SettingsPage({ i18n, language, account }: SettingsPageProps) {
  const { t } = i18n;
  const headingId = useId();
  const who =
    account === undefined
      ? t("settings.signedOut")
      : account.nickname === null
        ? t("settings.signedIn")
        : t("settings.signedInAs", { name: account.nickname });
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
            {account !== undefined && (
              <Button
                id="sign-out"
                variant="outlined"
                onClick={account.onSignOut}
                sx={{ flexShrink: 0 }}
              >
                {t("signOut.action")}
              </Button>
            )}
          </ListItem>
        </List>
      </SettingsSection>
    </Paper>
  );
}
