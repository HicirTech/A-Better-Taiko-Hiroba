import { Box, ListSubheader } from "@mui/material";
import type { ReactNode } from "react";

export interface SettingsSectionProps {
  readonly id: string;
  /** The heading's id, which names the section, and any group of choices in it too. */
  readonly headingId: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
}

export function SettingsSection({ id, headingId, icon, title, children }: SettingsSectionProps) {
  return (
    <Box component="section" id={id} aria-labelledby={headingId}>
      <ListSubheader
        component="h2"
        id={headingId}
        disableSticky
        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
      >
        {icon}
        {title}
      </ListSubheader>
      {children}
    </Box>
  );
}
