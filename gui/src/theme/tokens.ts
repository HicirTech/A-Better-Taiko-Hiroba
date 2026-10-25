import type { PaletteOptions } from "@mui/material";
import type { CSSProperties } from "react";

/** What a theme is made of: its colours in light and in dark, its fonts and its corners. */
export interface ThemeTokens {
  /** The colours laid over MUI's own in light mode; an empty palette keeps MUI's. */
  readonly light: PaletteOptions;
  /** The colours laid over MUI's own in dark mode. */
  readonly dark: PaletteOptions;
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
