import type { Locale } from "@abth/i18n";
import type { PaletteOptions } from "@mui/material";
import type { CSSProperties } from "react";

/** Holds the system fonts of the language words are marked with, per element. */
export const SYSTEM_FONTS = "--abth-system-fonts";

/** What a theme is made of: its colours in light and in dark, its fonts and its corners. */
export interface ThemeTokens {
  /** The colours laid over MUI's own in light mode; an empty palette keeps MUI's. */
  readonly light: PaletteOptions;
  /** The colours laid over MUI's own in dark mode. */
  readonly dark: PaletteOptions;
  /** The navigation panel's own colours in light and in dark; none draws it as the pages. */
  readonly navigation?: { readonly light: PaletteOptions; readonly dark: PaletteOptions };
  /** A language's fonts for what Latin ones lack: Windows', macOS'; Android goes by the mark. */
  readonly systemFonts: Readonly<Record<Locale, string>>;
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

const JAPANESE_FONTS = '"Yu Gothic UI", "Hiragino Sans"';

/** MUI's own blue and white, in Roboto, with 4 px corners and the sizes the app adds. */
export const DEFAULT_TOKENS: ThemeTokens = {
  light: {},
  dark: {},
  systemFonts: {
    // What an English page holds beyond Roboto is Hiroba's Japanese.
    en: JAPANESE_FONTS,
    ja: JAPANESE_FONTS,
    "zh-Hans": '"Microsoft YaHei UI", "PingFang SC"',
    "zh-Hant": '"Microsoft JhengHei UI", "PingFang HK"',
  },
  fontFamily: `"Roboto", "Helvetica", "Arial", var(${SYSTEM_FONTS}), sans-serif`,
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
