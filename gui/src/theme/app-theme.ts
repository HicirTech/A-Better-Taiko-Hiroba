import {
  createTheme,
  type PaletteMode,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
  type TypographyVariant,
} from "@mui/material";
import type { CSSProperties } from "react";

import type { ThemeName } from "./appearance";
import { DEFAULT_TOKENS, HIROBA_TOKENS, type ThemeTokens } from "./tokens";

declare module "@mui/material/styles" {
  interface Theme {
    /** The navigation panel's own theme in each mode, where the app's theme gives it one. */
    navigation?: Readonly<Record<PaletteMode, Theme>>;
  }
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

const shapeAndType = (tokens: ThemeTokens): ThemeOptions => ({
  shape: { borderRadius: tokens.cornerPx },
  typography: {
    fontFamily: tokens.fontFamily,
    fontFamilyMono: tokens.fontFamilyMono,
    rowLine: tokens.rowLine,
    badge: tokens.badge,
    figure: tokens.figure,
  },
});

/** The navigation panel's theme: its own palette, the page shown solid in its primary colour. */
const navigationTheme = (tokens: ThemeTokens, palette: PaletteOptions): Theme =>
  createTheme({
    palette: { ...palette, action: { ...palette.action, selectedOpacity: 1 } },
    ...shapeAndType(tokens),
    components: {
      // One colour at any elevation, as a bar is.
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            "&.Mui-selected": {
              color: theme.palette.primary.contrastText,
              "& .MuiListItemIcon-root": { color: "inherit" },
            },
          }),
        },
      },
    },
  });

/** The app's theme made from `tokens`, in light and in dark. */
export function createAppTheme(tokens: ThemeTokens): Theme {
  const theme = createTheme({
    colorSchemes: { light: { palette: tokens.light }, dark: { palette: tokens.dark } },
    ...shapeAndType(tokens),
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
  if (tokens.navigation !== undefined) {
    theme.navigation = {
      light: navigationTheme(tokens, tokens.navigation.light),
      dark: navigationTheme(tokens, tokens.navigation.dark),
    };
  }
  return theme;
}

export const appTheme = createAppTheme(DEFAULT_TOKENS);

/** A snapshot's theme: the default theme in light, whatever the app's theme and mode. */
export const SNAPSHOT_THEME = createTheme({
  palette: { ...DEFAULT_TOKENS.light, mode: "light" },
  ...shapeAndType(DEFAULT_TOKENS),
});

/** Each theme a player may choose, made once. */
export const APP_THEMES: Readonly<Record<ThemeName, Theme>> = {
  default: appTheme,
  hiroba: createAppTheme(HIROBA_TOKENS),
};

/** A text style's size, read from the theme where its other properties would not suit. */
export const textSize = (variant: TypographyVariant) => (theme: Theme) =>
  theme.typography[variant].fontSize;
