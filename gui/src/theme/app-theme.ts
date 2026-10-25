import { createTheme, type Theme, type TypographyVariant } from "@mui/material";
import type { CSSProperties } from "react";

import { DEFAULT_TOKENS, type ThemeTokens } from "./tokens";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    rowLine: CSSProperties;
    badge: CSSProperties;
    figure: CSSProperties;
    fontFamilyMono: string;
  }
  interface TypographyVariantsOptions {
    rowLine?: CSSProperties;
    badge?: CSSProperties;
    figure?: CSSProperties;
    fontFamilyMono?: string;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    rowLine: true;
    badge: true;
    figure: true;
  }
}

/** The app's theme made from `tokens`, in light and in dark. */
export function createAppTheme(tokens: ThemeTokens): Theme {
  return createTheme({
    colorSchemes: { light: { palette: tokens.light }, dark: { palette: tokens.dark } },
    shape: { borderRadius: tokens.cornerPx },
    typography: {
      fontFamily: tokens.fontFamily,
      fontFamilyMono: tokens.fontFamilyMono,
      rowLine: tokens.rowLine,
      badge: tokens.badge,
      figure: tokens.figure,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            // Keep the scrollbar's room on every page so the column stands still.
            // Not scrollbar-gutter: MUI's modals make up for this way alone.
            overflowY: "scroll",
            // A pull at the top reads again: no stretch or glow of the page's own competes with it.
            overscrollBehaviorY: "none",
          },
        },
      },
    },
  });
}

export const appTheme = createAppTheme(DEFAULT_TOKENS);

/** A text style's size, read from the theme where its other properties would not suit. */
export const textSize = (variant: TypographyVariant) => (theme: Theme) =>
  theme.typography[variant].fontSize;
