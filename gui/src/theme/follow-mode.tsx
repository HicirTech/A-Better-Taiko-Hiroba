import { useColorScheme } from "@mui/material";
import { useEffect } from "react";

import type { ThemeMode } from "./appearance";

/** Puts the theme in `mode`, under a ThemeProvider that keeps no mode of its own. */
export function FollowMode({ mode }: { readonly mode: ThemeMode }) {
  const { setMode } = useColorScheme();
  useEffect(() => setMode(mode), [mode, setMode]);
  return null;
}
