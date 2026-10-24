import type { Translator } from "@abth/i18n";
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useId } from "react";
import { REPOSITORY_NAME } from "../shared/updates";
import { GitHubIcon, OpenInNewIcon } from "../ui/icons";
import { SettingsSection } from "./settings-section";

/** The project's repository on GitHub, opened in the system's browser. */
export function GitHubSection({ i18n, onOpen }: { i18n: Translator; onOpen: () => void }) {
  const headingId = useId();
  return (
    <SettingsSection
      id="github"
      headingId={headingId}
      icon={<GitHubIcon fontSize="small" />}
      title={i18n.t("settings.github")}
    >
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton id="github-repository" onClick={onOpen} sx={{ gap: 2 }}>
            <ListItemText primary={REPOSITORY_NAME} secondary={i18n.t("settings.githubGives")} />
            <OpenInNewIcon fontSize="small" sx={{ color: "text.secondary" }} />
          </ListItemButton>
        </ListItem>
      </List>
    </SettingsSection>
  );
}
