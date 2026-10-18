import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Button, List, ListItem, ListItemText } from "@mui/material";
import { useId } from "react";

import { FileDownloadIcon } from "../ui/icons";
import type { ManualCheck } from "../updates/use-update-reminder";
import { SettingsSection } from "./settings-section";

export interface UpdatesSectionProps {
  readonly i18n: Translator;
  readonly version: string;
  readonly check: ManualCheck;
  readonly onCheck: () => void;
  readonly onOpenReleases: () => void;
}

const STATUS: Readonly<Record<ManualCheck, MessageKey | null>> = {
  idle: null,
  checking: "update.checking",
  upToDate: "update.upToDate",
  failed: "update.failed",
};

/** The build's version, with a button that checks the latest release for a newer one. */
export function UpdatesSection({
  i18n,
  version,
  check,
  onCheck,
  onOpenReleases,
}: UpdatesSectionProps) {
  const { t } = i18n;
  const headingId = useId();
  const status = STATUS[check];
  return (
    <SettingsSection
      id="updates"
      headingId={headingId}
      icon={<FileDownloadIcon fontSize="small" />}
      title={t("settings.updates")}
    >
      <List disablePadding>
        <ListItem sx={{ gap: 2, flexWrap: "wrap" }}>
          <ListItemText
            aria-live="polite"
            primary={t("settings.version", { version })}
            secondary={status === null ? null : t(status)}
            slotProps={{ primary: { id: "app-version" }, secondary: { id: "update-status" } }}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
            {check === "failed" && (
              <Button id="update-releases" variant="outlined" onClick={onOpenReleases}>
                {t("update.openReleases")}
              </Button>
            )}
            <Button
              id="update-check"
              variant="outlined"
              disabled={check === "checking"}
              onClick={onCheck}
            >
              {t("update.check")}
            </Button>
          </Box>
        </ListItem>
      </List>
    </SettingsSection>
  );
}
