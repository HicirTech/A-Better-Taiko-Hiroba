import type { PaletteOptions } from "@mui/material";
import type { CSSProperties } from "react";

/** What a theme is made of: its colours in light and in dark, its fonts and its corners. */
export interface ThemeTokens {
  /** The colours laid over MUI's own in light mode; an empty palette keeps MUI's. */
  readonly light: PaletteOptions;
  /** The colours laid over MUI's own in dark mode. */
  readonly dark: PaletteOptions;
  /** The navigation panel's own colours in light and in dark; none draws it as the pages. */
  readonly navigation?: { readonly light: PaletteOptions; readonly dark: PaletteOptions };
  readonly fontFamily: string;
  /** For codes a player copies into a report. */
  readonly fontFamilyMono: string;
  /** A row's grey line under its name. */
  readonly rowLine: CSSProperties;
  /** A level badge's number. */
  readonly badge: CSSProperties;
  /** A figure that stands out, such as a rating. */
  readonly figure: CSSProperties;
  readonly cornerPx: number;
}

/** MUI's own blue and white, in Roboto, with 4 px corners and the sizes the app adds. */
export const DEFAULT_TOKENS: ThemeTokens = {
  light: {},
  dark: {},
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontFamilyMono: "monospace",
  rowLine: { fontSize: "0.8125rem", lineHeight: 1.4 },
  badge: { fontSize: "0.6875rem", fontWeight: 700 },
  figure: { fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.3 },
  cornerPx: 4,
};

// Hiroba's own colours, as its pages draw them.
const TITLE_RED = "#9a1200";
const COLUMN_YELLOW = "#ffcc00";
const NOTE_CREAM = "#fff7d4";
const PAGE_ORANGE = "#ff7f00";
const FOOT_PURPLE = "#52009b";
// Its purple and its red darkened, for the night.
const NIGHT = "#150826";
const NIGHT_CARD = "#1f0f35";
const NIGHT_RED = "#4d0900";

/** Hiroba's colours as its pages wear them: words on its yellow and cream, its red around them. */
export const HIROBA_TOKENS: ThemeTokens = {
  ...DEFAULT_TOKENS,
  light: {
    primary: { main: TITLE_RED },
    secondary: { main: FOOT_PURPLE },
    background: { default: COLUMN_YELLOW, paper: NOTE_CREAM },
  },
  dark: {
    primary: { main: PAGE_ORANGE },
    secondary: { main: COLUMN_YELLOW },
    background: { default: NIGHT, paper: NIGHT_CARD },
  },
  // As Hiroba's title bar: white words on its red, the page shown in its yellow.
  navigation: {
    light: {
      mode: "dark",
      primary: { main: COLUMN_YELLOW },
      background: { default: TITLE_RED, paper: TITLE_RED },
    },
    dark: {
      mode: "dark",
      primary: { main: COLUMN_YELLOW },
      background: { default: NIGHT_RED, paper: NIGHT_RED },
    },
  },
};
