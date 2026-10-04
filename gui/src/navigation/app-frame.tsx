import type { MessageKey, Translator } from "@abth/i18n";
import {
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  SvgIcon,
  Typography,
} from "@mui/material";
import { type ReactNode, useEffect, useEffectEvent, useId, useState } from "react";

import { VISUALLY_HIDDEN } from "../my-page/hiroba-px";
import type { SystemBack } from "../platform";
import { backAction } from "./back-action";
import { BackClosersContext, BackModesContext, createBackClosers } from "./back-closers";
import { MenuOpenContext } from "./menu-open";
import {
  CostumeIcon,
  FavoritesIcon,
  NameTitleIcon,
  OverviewIcon,
  SettingsIcon,
} from "./page-icons";
import { PAGES, type Page } from "./pages";
import { useMenuSwipe } from "./use-menu-swipe";
import { useTouchFirst } from "./use-touch-first";
import { useWideWindow } from "./use-wide-window";
import { WiderFrameContext } from "./wider-frame";

const PAGE_ENTRY: Readonly<Record<Page, { readonly label: MessageKey; readonly icon: ReactNode }>> =
  {
    overview: { label: "nav.overview", icon: <OverviewIcon /> },
    costume: { label: "nav.costume", icon: <CostumeIcon /> },
    nameTitle: { label: "nav.nameTitle", icon: <NameTitleIcon /> },
    favorites: { label: "nav.favorites", icon: <FavoritesIcon /> },
    settings: { label: "nav.settings", icon: <SettingsIcon /> },
  };

const PANEL_WIDTH_PX = 240;
const MENU_INSET_PX = 8;
// The band the floating buttons sit in; fixed so every page starts at the same height.
const TOP_BAND_PX = 64;
const PAGE_BOTTOM_PX = 32;
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
export const BELOW_TOP_BAND = `calc(${TOP_BAND_PX}px + ${SAFE_TOP})`;
const PAGE_HEIGHT = `calc(100vh - ${TOP_BAND_PX + PAGE_BOTTOM_PX}px)`;

interface NavigationProps {
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  readonly i18n: Translator;
}

export function AppFrame({
  page,
  onNavigate,
  i18n,
  back,
  children,
}: NavigationProps & { back?: SystemBack; children: ReactNode }) {
  const wide = useWideWindow();
  const [wider, setWider] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Shut a menu left open on a wide window, so it does not reopen unasked when the window narrows.
  if (wide && menuOpen) {
    setMenuOpen(false);
  }
  const [closers] = useState(createBackClosers);
  const [modes] = useState(createBackClosers);
  const pressedBack = useEffectEvent((system: SystemBack) => {
    const action = backAction({
      overlayOpen: closers.isOpen(),
      menuOpen,
      modeOn: modes.isOpen(),
      page,
    });
    if (action === "closeOverlay") {
      closers.closeLatest();
    } else if (action === "closeMenu") {
      setMenuOpen(false);
    } else if (action === "leaveMode") {
      modes.closeLatest();
    } else if (action === "overview") {
      onNavigate("overview");
    } else {
      system.leave();
    }
  });
  useEffect(() => back?.listen(() => pressedBack(back)), [back]);
  return (
    <BackClosersContext value={closers}>
      <MenuOpenContext value={menuOpen}>
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          {wide ? (
            <SidePanel page={page} onNavigate={onNavigate} i18n={i18n} />
          ) : (
            <MenuDrawer
              page={page}
              onNavigate={onNavigate}
              i18n={i18n}
              open={menuOpen}
              onOpenChange={setMenuOpen}
            />
          )}
          <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Container
              maxWidth={wider ? "lg" : "md"}
              sx={{ pt: `${TOP_BAND_PX}px`, pb: `${PAGE_BOTTOM_PX}px` }}
            >
              <Typography component="h1" sx={VISUALLY_HIDDEN}>
                {i18n.t(PAGE_ENTRY[page].label)}
              </Typography>
              <WiderFrameContext value={setWider}>
                <BackModesContext value={modes}>{children}</BackModesContext>
              </WiderFrameContext>
            </Container>
          </Box>
        </Box>
      </MenuOpenContext>
    </BackClosersContext>
  );
}

/** A page's own action, stuck in the top band at the right; render it first for focus order. */
export function FrameCorner({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: BELOW_TOP_BAND,
        zIndex: "appBar",
        height: 0,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <Box sx={{ transform: `translateY(${MENU_INSET_PX - TOP_BAND_PX}px)` }}>{children}</Box>
    </Box>
  );
}

/** Room beside a band button: a small button and the gap after it. */
const BAND_BUTTON_ROOM_PX = 48;

/** A page's bar across the top band, clear of the menu button and the corner's action. */
export function FrameTop({ children }: { children: ReactNode }) {
  const wide = useWideWindow();
  // A touch screen draws neither button: its swipes and pull stand in for them.
  const room = useTouchFirst() ? 0 : BAND_BUTTON_ROOM_PX;
  return (
    <Box sx={{ position: "sticky", top: BELOW_TOP_BAND, zIndex: "appBar", height: 0 }}>
      <Box
        sx={{
          transform: `translateY(${MENU_INSET_PX - TOP_BAND_PX}px)`,
          ml: wide ? 0 : `${room}px`,
          mr: `${room}px`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// A bottom bar sits flush with the window's edge: the page fills the window and the bar, its last
// child, overlaps the frame's bottom room by a negative margin (a Stack's child may not have one).
export const BOTTOM_BAR_PAGE = { minHeight: PAGE_HEIGHT } as const;
export const BOTTOM_BAR = { mb: `-${PAGE_BOTTOM_PX}px` } as const;

/** Below this height a block that stays in view would crowd the page, so it scrolls with it. */
const TALL_WINDOW_PX = 640;
export const WHEN_TALL = `@media (min-height: ${TALL_WINDOW_PX}px)`;
export const STAYS_IN_VIEW = {
  [WHEN_TALL]: { position: "sticky", top: BELOW_TOP_BAND },
} as const;

function PageList({ page, onNavigate, i18n }: NavigationProps) {
  return (
    <>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        noWrap
        sx={{ px: 3, pt: 2.5, pb: 1.5 }}
      >
        {i18n.t("app.title")}
      </Typography>
      <List disablePadding>
        {PAGES.map((each) => (
          <ListItemButton
            key={each}
            id={`nav-${each}`}
            selected={each === page}
            aria-current={each === page ? "page" : undefined}
            onClick={() => onNavigate(each)}
            sx={{ mr: 1.5, borderRadius: "0 999px 999px 0" }}
          >
            <ListItemIcon>{PAGE_ENTRY[each].icon}</ListItemIcon>
            <ListItemText
              primary={i18n.t(PAGE_ENTRY[each].label)}
              slotProps={{ primary: { sx: { fontWeight: each === page ? 600 : undefined } } }}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}

function SidePanel(props: NavigationProps) {
  return (
    <Box component="nav" sx={{ width: PANEL_WIDTH_PX, flexShrink: 0 }}>
      <Drawer
        variant="permanent"
        sx={{ "& .MuiDrawer-paper": { width: PANEL_WIDTH_PX, boxSizing: "border-box" } }}
      >
        <PageList {...props} />
      </Drawer>
    </Box>
  );
}

// Material's "menu" icon (Apache 2.0), inline because the icons package is not a dependency.
function MenuIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
    </SvgIcon>
  );
}

// Kept fixed: focusing a hidden absolute box would scroll the page to the top.
const HIDDEN_UNTIL_FOCUSED = {
  "&:not(:has(.Mui-focusVisible))": { ...VISUALLY_HIDDEN, position: "fixed" },
} as const;

function MenuDrawer({
  page,
  onNavigate,
  i18n,
  open,
  onOpenChange: setOpen,
}: NavigationProps & { readonly open: boolean; readonly onOpenChange: (open: boolean) => void }) {
  const drawerId = useId();
  const label = i18n.t("nav.menu");
  const touchFirst = useTouchFirst();
  useMenuSwipe({ active: touchFirst, open, onOpenChange: setOpen });
  const pick = (next: Page) => {
    setOpen(false);
    onNavigate(next);
  };
  return (
    <>
      <Paper
        elevation={2}
        sx={{
          position: "fixed",
          top: `calc(${MENU_INSET_PX}px + ${SAFE_TOP})`,
          left: `calc(${MENU_INSET_PX}px + env(safe-area-inset-left, 0px))`,
          zIndex: "appBar",
          borderRadius: "50%",
          ...(touchFirst ? HIDDEN_UNTIL_FOCUSED : {}),
        }}
      >
        <IconButton
          id="nav-menu"
          aria-label={label}
          title={label}
          aria-controls={open ? drawerId : undefined}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <MenuIcon />
        </IconButton>
      </Paper>
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { id: drawerId, sx: { width: PANEL_WIDTH_PX } } }}
      >
        <Box component="nav" aria-label={label}>
          <PageList page={page} onNavigate={pick} i18n={i18n} />
        </Box>
      </Drawer>
    </>
  );
}
