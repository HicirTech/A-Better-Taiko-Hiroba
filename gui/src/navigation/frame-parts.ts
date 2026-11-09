import type { Translator } from "@abth/i18n";

import { MENU_INSET_PX, SAFE_TOP } from "../ui/frame-top";
import { VISUALLY_HIDDEN } from "../ui/visually-hidden";
import type { NavEntry } from "./nav-entry";
import type { Page } from "./pages";

export const PANEL_WIDTH_PX = 240;

export interface NavigationProps {
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  readonly i18n: Translator;
  /** Every page, as the navigation lists it. */
  readonly pages: Readonly<Record<Page, NavEntry>>;
  /** Opens the scanner from beside the app's name; none leaves the panel without it. */
  readonly onScan?: (() => void) | undefined;
}

/** The way to the pipelines page from the pages' list, where there is one. */
export interface PipelinesToggle {
  readonly shown: boolean;
  readonly onShownChange: (shown: boolean) => void;
}

/** Where the navigation's foot is drawn, while there is one to draw it in. */
export type FootRef = (foot: HTMLElement | null) => void;

export const BAND_BUTTON = {
  position: "fixed",
  top: `calc(${MENU_INSET_PX}px + ${SAFE_TOP})`,
  zIndex: "appBar",
  borderRadius: "50%",
} as const;

// Kept fixed: focusing a hidden absolute box would scroll the page to the top.
export const HIDDEN_UNTIL_FOCUSED = {
  "&:not(:has(.Mui-focusVisible))": { ...VISUALLY_HIDDEN, position: "fixed" },
} as const;
