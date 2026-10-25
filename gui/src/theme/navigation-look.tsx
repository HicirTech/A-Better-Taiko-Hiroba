import { ThemeProvider, useTheme } from "@mui/material";
import type { ReactNode } from "react";

/** Draws its children in the navigation panel's own colours, where the theme gives it some. */
export function NavigationLook({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  const own = theme.navigation?.[theme.palette.mode];
  return own === undefined ? children : <ThemeProvider theme={own}>{children}</ThemeProvider>;
}
