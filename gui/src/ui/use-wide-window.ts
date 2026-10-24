import { useMediaQuery, useTheme } from "@mui/material";

/** Whether the window is wide enough for the side panel: MUI's `md` and up. */
export function useWideWindow(): boolean {
  return useMediaQuery(useTheme().breakpoints.up("md"), { noSsr: true });
}
