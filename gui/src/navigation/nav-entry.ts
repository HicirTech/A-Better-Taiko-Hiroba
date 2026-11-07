import type { MessageKey } from "@abth/i18n";
import type { ReactNode } from "react";

/** How the navigation lists a page: its name and its icon. */
export interface NavEntry {
  readonly label: MessageKey;
  readonly icon: ReactNode;
}
