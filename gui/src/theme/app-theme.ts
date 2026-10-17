import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  colorSchemes: { dark: true },
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
