import { Box } from "@mui/material";
import type { ReactNode } from "react";

import { SectionCard } from "../ui/section-card";
import { SectionTitle } from "../ui/section-title";

// The rows reach the card's edges, and keep the card's room before their words.
const ROWS = {
  "& .MuiListItem-gutters.MuiListItem-padding, & .MuiListItemButton-gutters": { px: 1 },
} as const;

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
    <SectionCard component="section" id={id} aria-labelledby={headingId} flush sx={ROWS}>
      <Box sx={{ px: 1, pt: 1 }}>
        <SectionTitle id={headingId} start={icon}>
          {title}
        </SectionTitle>
      </Box>
      {children}
    </SectionCard>
  );
}
