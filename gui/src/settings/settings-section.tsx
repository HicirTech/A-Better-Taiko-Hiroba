import type { ReactNode } from "react";

import { SectionCard } from "../ui/section-card";

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
    <SectionCard id={id} heading={{ id: headingId, start: icon, children: title }} flush sx={ROWS}>
      {children}
    </SectionCard>
  );
}
