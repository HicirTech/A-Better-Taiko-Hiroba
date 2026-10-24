import { Box } from "@mui/material";
import type { ReactNode } from "react";

import { useTouchFirst } from "./use-touch-first";
import { useWideWindow } from "./use-wide-window";

export const MENU_INSET_PX = 8;
// The band the floating buttons sit in; fixed so every page starts at the same height.
export const TOP_BAND_PX = 64;
export const PAGE_BOTTOM_PX = 32;
export const SAFE_TOP = "env(safe-area-inset-top, 0px)";
export const BELOW_TOP_BAND = `calc(${TOP_BAND_PX}px + ${SAFE_TOP})`;
/** The window's room for a page: below the top band and above the frame's bottom room. */
export const PAGE_HEIGHT = `calc(100vh - ${TOP_BAND_PX + PAGE_BOTTOM_PX}px)`;
// MUI's sm width: a narrow window's column need not stretch across it.
export const COLUMN_MAX_WIDTH_PX = 600;

/** Room beside a band button: a small button and the gap after it. */
const BAND_BUTTON_ROOM_PX = 48;

/** A page's bar across the top band, clear of the menu button. */
export function FrameTop({ children }: { children: ReactNode }) {
  const wide = useWideWindow();
  const touchFirst = useTouchFirst();
  // A touch screen draws no menu button: its swipe stands in for it.
  const room = wide || touchFirst ? 0 : BAND_BUTTON_ROOM_PX;
  return (
    <Box sx={{ position: "sticky", top: BELOW_TOP_BAND, zIndex: "appBar", height: 0 }}>
      <Box
        sx={{
          transform: `translateY(${MENU_INSET_PX - TOP_BAND_PX}px)`,
          ml: `${room}px`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Below this height a block that stays in view would crowd the page, so it scrolls with it. */
const TALL_WINDOW_PX = 640;
export const WHEN_TALL = `@media (min-height: ${TALL_WINDOW_PX}px)`;
export const STAYS_IN_VIEW = {
  [WHEN_TALL]: { position: "sticky", top: BELOW_TOP_BAND },
} as const;
