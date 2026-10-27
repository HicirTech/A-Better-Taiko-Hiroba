import { Box, type Theme } from "@mui/material";
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
const WITH_END = { display: "flex", alignItems: "center" } as const;
const slide = (theme: Theme) =>
  theme.transitions.create(["width", "opacity", "visibility"], {
    duration: theme.transitions.duration.shorter,
  });
// The end's room holds its gap too, so the bar takes all of it as the room slides shut.
const END_ROOM = {
  display: "flex",
  flexShrink: 0,
  overflow: "hidden",
  "@media (prefers-reduced-motion: no-preference)": { transition: slide },
} as const;
const END_SHOWN = { ...END_ROOM, width: BAND_BUTTON_ROOM_PX, opacity: 1, visibility: "visible" };
const END_ASIDE = { ...END_ROOM, width: 0, opacity: 0, visibility: "hidden" };
const END_IN_ITS_ROOM = { display: "flex", flexShrink: 0, pl: 1 } as const;
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
  endShown = true,
  children,
}: {
  /** Wide enough for the side panel, which leaves no menu button in the band. */
  readonly wide: boolean;
  readonly touchFirst: boolean;
  /** Stays in the band as the page scrolls; false leaves it at the page's top. */
  readonly stays?: boolean;
  /** At the right, after the bar: a page's own button, such as its share. */
  readonly end?: ReactNode;
  /** False slides the end out, still mounted, and the bar across the room it leaves. */
  readonly endShown?: boolean;
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
            <Box sx={endShown ? END_SHOWN : END_ASIDE}>
              <Box sx={END_IN_ITS_ROOM}>{end}</Box>
            </Box>
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
