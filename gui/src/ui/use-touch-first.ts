import { useMediaQuery } from "@mui/material";

/** Whether the screen is touch-first: its main pointer is coarse. */
export function useTouchFirst(): boolean {
  return useMediaQuery("(pointer: coarse)", { noSsr: true });
}
