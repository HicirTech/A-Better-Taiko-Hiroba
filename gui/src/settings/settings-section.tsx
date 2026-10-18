import { Box } from "@mui/material";
import type { ReactNode } from "react";

import { SectionTitle } from "../ui/section-title";

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
      <Box sx={{ px: 2, pt: 2 }}>
        <SectionTitle id={headingId} start={icon}>
          {title}
        </SectionTitle>
      </Box>
      {children}
    </Box>
  );
}
