import type { Translator } from "@abth/i18n";
import { List, ListItem, ListItemButton, ListItemText, SvgIcon } from "@mui/material";
import { useId } from "react";

import { REPOSITORY_NAME } from "../updates";
import { SettingsSection } from "./settings-section";

// GitHub's mark (Octicons, MIT), inline: the icons package is not a dependency.
function GitHubIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small" viewBox="0 0 16 16">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </SvgIcon>
  );
}

// Material's "open_in_new" icon (Apache 2.0), inline: the icons package is not a dependency.
function OpenInNewIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small" sx={{ color: "text.secondary" }}>
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z" />
    </SvgIcon>
  );
}

/** The project's repository on GitHub, opened in the system's browser. */
export function GitHubSection({ i18n, onOpen }: { i18n: Translator; onOpen: () => void }) {
  const headingId = useId();
  return (
    <SettingsSection
      id="github"
      headingId={headingId}
      icon={<GitHubIcon />}
      title={i18n.t("settings.github")}
    >
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton id="github-repository" onClick={onOpen} sx={{ gap: 2 }}>
            <ListItemText primary={REPOSITORY_NAME} secondary={i18n.t("settings.githubGives")} />
            <OpenInNewIcon />
          </ListItemButton>
        </ListItem>
      </List>
    </SettingsSection>
  );
}
