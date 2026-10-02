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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { type ReactNode, useEffect, useEffectEvent, useId, useState } from "react";

import { VISUALLY_HIDDEN } from "../my-page/hiroba-px";
import type { SystemBack } from "../platform";
import { backAction } from "./back-action";
import { CostumeIcon, FavoritesIcon, OverviewIcon, SettingsIcon } from "./page-icons";
import { PAGES, type Page } from "./pages";

/** Each page's name and icon, as the navigation shows them. */
const PAGE_ENTRY: Readonly<Record<Page, { readonly label: MessageKey; readonly icon: ReactNode }>> =
  {
    overview: { label: "nav.overview", icon: <OverviewIcon /> },
    costume: { label: "nav.costume", icon: <CostumeIcon /> },
    favorites: { label: "nav.favorites", icon: <FavoritesIcon /> },
    settings: { label: "nav.settings", icon: <SettingsIcon /> },
  };

/** The side panel's width, and the menu's, about Gmail's. */
const PANEL_WIDTH_PX = 240;
/** How far in from the window's top left corner the menu button floats. */
const MENU_INSET_PX = 8;
/**
 * The band at the top of every page that the floating buttons sit in: the menu button at its left
 * on a narrow window, and a page's own action at its right (FrameCorner). The same on every page
 * and at every width, so each page starts at the same height.
 */
const TOP_BAND_PX = 64;
/** The room under every page's content. */
const PAGE_BOTTOM_PX = 32;
/** The safe area at the window's top, where a phone may draw its status bar over the page. */
const SAFE_TOP = "env(safe-area-inset-top, 0px)";

interface NavigationProps {
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  readonly i18n: Translator;
}

/**
 * The window, with no header (the user's call, 2026-09-29): its pages in a side panel like Gmail's
 * on a wide window (MUI's md and up), or behind a menu button floating at its top left on a narrow
 * one, and the page shown beside or under it. Each page is named by a heading for screen readers
 * alone: the navigation already shows sighted users which page they are on.
 *
 * Where the system has a Back (`back`, Android's), the window hears it while it is open and does
 * what backAction says: Back shuts the menu, goes back to the Overview, or leaves the app.
 */
export function AppFrame({
  page,
  onNavigate,
  i18n,
  back,
  children,
}: NavigationProps & { back?: SystemBack; children: ReactNode }) {
  const wide = useMediaQuery(useTheme().breakpoints.up("md"), { noSsr: true });
  const [menuOpen, setMenuOpen] = useState(false);
  // The menu is drawn on a narrow window alone: one left open there is shut on a wide one, so it
  // is not open again, unasked, when the window narrows.
  if (wide && menuOpen) {
    setMenuOpen(false);
  }
  const pressedBack = useEffectEvent((system: SystemBack) => {
    const action = backAction(menuOpen, page);
    if (action === "closeMenu") {
      setMenuOpen(false);
    } else if (action === "overview") {
      onNavigate("overview");
    } else {
      system.leave();
    }
  });
  useEffect(() => back?.listen(() => pressedBack(back)), [back]);
  return (
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
        {/* The page starts under the top band's buttons, not behind them. */}
        <Container maxWidth="md" sx={{ pt: `${TOP_BAND_PX}px`, pb: `${PAGE_BOTTOM_PX}px` }}>
          <Typography component="h1" sx={VISUALLY_HIDDEN}>
            {i18n.t(PAGE_ENTRY[page].label)}
          </Typography>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

/**
 * A page's own action, in the top band at the right of the page, level with the menu button, and
 * kept there over the page as it scrolls. It takes no room: the page starts under the band either
 * way. It goes first in the page, so it comes first in the focus order too.
 */
export function FrameCorner({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        // Stuck where it stands at the top, from the first pixel of scroll on: the band's bottom.
        position: "sticky",
        top: `calc(${TOP_BAND_PX}px + ${SAFE_TOP})`,
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

/**
 * For a page that keeps a bar at the bottom edge of the window, which sits flush with the edge
 * however little the page has to show, and stays there as the page scrolls. The page is tall enough
 * to fill the window down to where the frame's room under it begins, which is not more than the
 * window, so it does not scroll for nothing; and the bar, the page's last child, is let over that
 * room by a negative margin, which a child of a plain box may have (a child of a Stack may not).
 */
export const BOTTOM_BAR_PAGE = {
  minHeight: `calc(100vh - ${TOP_BAND_PX + PAGE_BOTTOM_PX}px)`,
} as const;
export const BOTTOM_BAR = { mb: `-${PAGE_BOTTOM_PX}px` } as const;

/** The product's name, small, over the pages, each with its icon, the one shown highlighted. */
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

/** The pages down the window's left edge, always there. */
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

/**
 * Material's "menu" icon (Apache 2.0), drawn inline: the icons package is not a dependency. The
 * button it is on carries the name.
 */
function MenuIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
    </SvgIcon>
  );
}

/**
 * The pages behind a menu button, for a narrow window with no room for the panel. The button
 * floats at the top left, over the page as it scrolls, clear of the system's bars, and opens the
 * pages in a drawer from the left. A pick, a tap outside the drawer, Escape or Android's Back
 * closes it, and the focus goes back to the button. The window holds whether it is open, for Back.
 */
function MenuDrawer({
  page,
  onNavigate,
  i18n,
  open,
  onOpenChange: setOpen,
}: NavigationProps & { readonly open: boolean; readonly onOpenChange: (open: boolean) => void }) {
  const drawerId = useId();
  const label = i18n.t("nav.menu");
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
