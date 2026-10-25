import { Box } from "@mui/material";
import type { ReactNode } from "react";

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
const WITH_END = { display: "flex", alignItems: "center", gap: 1 } as const;
const STAYS_IN_THE_BAND = {
  position: "sticky",
  top: BELOW_TOP_BAND,
  zIndex: "appBar",
  height: 0,
} as const;
const AT_THE_TOP = { position: "relative", zIndex: "appBar", height: 0 } as const;

/** A page's bar across the top band, clear of the menu button; its end at the band's right. */
export function FrameTop({
  wide,
  touchFirst,
  stays = true,
  end,
  children,
}: {
  /** Wide enough for the side panel, which leaves no menu button in the band. */
  readonly wide: boolean;
  readonly touchFirst: boolean;
  /** Stays in the band as the page scrolls; false leaves it at the page's top. */
  readonly stays?: boolean;
  /** At the right, after the bar: a page's own button, such as its share. */
  readonly end?: ReactNode;
  readonly children?: ReactNode;
}) {
  // A touch screen draws no menu button: its swipe stands in for it.
  const room = wide || touchFirst ? 0 : BAND_BUTTON_ROOM_PX;
  return (
    <Box sx={stays ? STAYS_IN_THE_BAND : AT_THE_TOP}>
      <Box
        sx={{
          transform: `translateY(${MENU_INSET_PX - TOP_BAND_PX}px)`,
          ml: `${room}px`,
          ...(end === undefined ? {} : WITH_END),
        }}
      >
        {end === undefined ? (
          children
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
            {end}
          </>
        )}
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
