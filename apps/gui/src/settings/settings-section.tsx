import { Box, ListSubheader } from "@mui/material";
import type { ReactNode } from "react";

export interface SettingsSectionProps {
  readonly id: string;
  /** The heading's id, which names the section, and any group of choices in it too. */
  readonly headingId: string;
  /** Marks the section beside its heading: every section of Settings has one. */
  readonly icon: ReactNode;
  readonly title: string;
  /** The section's rows, one list of them. */
  readonly children: ReactNode;
}

/**
 * A section of Settings, as Gmail's settings draw one: a small heading with its icon, over the
 * section's rows. The heading is outside the rows' list, where a list may hold only its items.
 */
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
