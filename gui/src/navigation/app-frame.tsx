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
  Slide,
  SvgIcon,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { VISUALLY_HIDDEN } from "../my-page/hiroba-px";
import type { SystemBack } from "../platform";
import { backAction } from "./back-action";
import { BackClosersContext, BackModesContext, createBackClosers } from "./back-closers";
import { FrameNavigationContext } from "./frame-navigation";
import { MenuOpenContext } from "./menu-open";
import {
  CostumeIcon,
  FavoritesIcon,
  NameTitleIcon,
  OverviewIcon,
  SettingsIcon,
} from "./page-icons";
import { PAGES, type Page } from "./pages";
import type { SwipeDirection } from "./swipe-gesture";
import { useMenuSwipe } from "./use-menu-swipe";
import { usePipelinesSwipe } from "./use-pipelines-swipe";
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

/** The way to the pipelines page from the pages' list, where there is one. */
interface PipelinesToggle {
  readonly shown: boolean;
  readonly onShownChange: (shown: boolean) => void;
}

/** Where the navigation's foot is drawn, while there is one to draw it in. */
type FootRef = (foot: HTMLElement | null) => void;
const NavFootContext = createContext<HTMLElement | null>(null);

/** Drawn at the foot of the navigation, such as the way to read again; nowhere while it is shut. */
export function NavFoot({ children }: { children: ReactNode }) {
  const foot = useContext(NavFootContext);
  return foot === null ? null : createPortal(children, foot);
}

export function AppFrame({
  page,
  onNavigate,
  i18n,
  back,
  pipelines,
  children,
}: NavigationProps & {
  back?: SystemBack;
  /** The page one level past the menu; without it there is no way there. */
  pipelines?: ReactNode;
  children: ReactNode;
}) {
  const wide = useWideWindow();
  const touchFirst = useTouchFirst();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [wider, setWider] = useState(false);
  const [navigation, setNavigation] = useState(true);
  const [foot, setFoot] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pipelinesShown, setPipelinesShown] = useState(false);
  // Shut a menu left open on a wide window, or by a sign-out, so it does not reopen unasked.
  if ((wide || !navigation) && menuOpen) {
    setMenuOpen(false);
  }
  // A sign-out takes the pipelines page with the menu: neither is there while signed out.
  if (!navigation && pipelinesShown) {
    setPipelinesShown(false);
  }
  // The page under the pipelines page goes back to where it was scrolled.
  const pageScroll = useRef(0);
  useLayoutEffect(() => {
    if (!pipelinesShown) {
      window.scrollTo(0, pageScroll.current);
    }
  }, [pipelinesShown]);
  const showPipelines = (shown: boolean) => {
    if (shown) {
      pageScroll.current = window.scrollY;
      window.scrollTo(0, 0);
    }
    setMenuOpen(false);
    setPipelinesShown(shown);
  };
  const navigate = (next: Page) => {
    pageScroll.current = 0;
    setPipelinesShown(false);
    onNavigate(next);
  };
  const toggle: PipelinesToggle | undefined =
    pipelines === undefined ? undefined : { shown: pipelinesShown, onShownChange: showPipelines };
  usePipelinesSwipe({
    active: touchFirst && toggle !== undefined,
    // A wide window's panel is the menu always open: the same swipe goes past it.
    pagesShown: navigation && (menuOpen || wide),
    pipelinesShown,
    listRightPx: PANEL_WIDTH_PX,
    onSwiped: (direction: SwipeDirection) => {
      showPipelines(direction === "right");
      // Back from the pipelines page is the menu it was reached from.
      if (direction === "left" && !wide) {
        setMenuOpen(true);
      }
    },
  });
  const [closers] = useState(createBackClosers);
  const [modes] = useState(createBackClosers);
  const pressedBack = useEffectEvent((system: SystemBack) => {
    const action = backAction({
      overlayOpen: closers.isOpen(),
      pipelinesShown,
      menuOpen,
      modeOn: modes.isOpen(),
      page,
    });
    if (action === "closeOverlay") {
      closers.closeLatest();
    } else if (action === "leavePipelines") {
      showPipelines(false);
      if (!wide) {
        setMenuOpen(true);
      }
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
          {navigation &&
            (wide ? (
              <SidePanel
                page={page}
                onNavigate={navigate}
                i18n={i18n}
                footRef={setFoot}
                toggle={toggle}
              />
            ) : (
              <MenuDrawer
                page={page}
                onNavigate={navigate}
                i18n={i18n}
                footRef={setFoot}
                toggle={toggle}
                open={menuOpen}
                onOpenChange={setMenuOpen}
              />
            ))}
          <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Container
              maxWidth={wider ? "lg" : "md"}
              sx={{ pt: `${TOP_BAND_PX}px`, pb: `${PAGE_BOTTOM_PX}px` }}
            >
              <Typography component="h1" sx={VISUALLY_HIDDEN}>
                {i18n.t(pipelinesShown ? "nav.pipelines" : PAGE_ENTRY[page].label)}
              </Typography>
              {/* Kept, only hidden, under the pipelines page: going back reads nothing again. */}
              <Box hidden={pipelinesShown}>
                <WiderFrameContext value={setWider}>
                  <FrameNavigationContext value={setNavigation}>
                    <NavFootContext value={foot}>
                      <BackModesContext value={modes}>{children}</BackModesContext>
                    </NavFootContext>
                  </FrameNavigationContext>
                </WiderFrameContext>
              </Box>
              {pipelines !== undefined && (
                <Slide
                  direction="right"
                  in={pipelinesShown}
                  enter={!reducedMotion}
                  exit={false}
                  mountOnEnter
                  unmountOnExit
                >
                  <Box>{pipelines}</Box>
                </Slide>
              )}
            </Container>
          </Box>
        </Box>
      </MenuOpenContext>
    </BackClosersContext>
  );
}

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

// Material's "arrow_back" and "arrow_forward" icons (Apache 2.0), inline as the menu's is.
function ArrowBackIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </SvgIcon>
  );
}

function ArrowForwardIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
    </SvgIcon>
  );
}

const TITLE_ROW = { px: 3, pt: 2.5, pb: 1.5 } as const;
const ARROW_ROW = { pl: 1.5, pr: 3, pt: 1.5, pb: 0.5 } as const;

function PageList({
  page,
  onNavigate,
  i18n,
  toggle,
}: NavigationProps & { readonly toggle: PipelinesToggle | undefined }) {
  const title = (
    <Typography variant="subtitle2" color="text.secondary" noWrap>
      {i18n.t("app.title")}
    </Typography>
  );
  const pipelinesLabel = i18n.t("nav.pipelines");
  const touchFirst = useTouchFirst();
  return (
    <>
      {toggle === undefined ? (
        <Box sx={TITLE_ROW}>{title}</Box>
      ) : (
        // The pipelines page lies one level past the pages, to the left: the arrow says which way.
        // A touch screen draws no arrow, as it draws no menu button: its swipe stands in for it.
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            ...(touchFirst ? TITLE_ROW : ARROW_ROW),
          }}
        >
          <Box sx={touchFirst ? HIDDEN_UNTIL_FOCUSED : undefined}>
            <IconButton
              id="nav-pipelines"
              size="small"
              aria-label={pipelinesLabel}
              title={pipelinesLabel}
              aria-pressed={toggle.shown}
              onClick={() => toggle.onShownChange(!toggle.shown)}
            >
              {toggle.shown ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
          </Box>
          {title}
        </Box>
      )}
      <List disablePadding>
        {PAGES.map((each) => {
          const current = toggle?.shown !== true && each === page;
          return (
            <ListItemButton
              key={each}
              id={`nav-${each}`}
              selected={current}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(each)}
              sx={{ mr: 1.5, borderRadius: "0 999px 999px 0" }}
            >
              <ListItemIcon>{PAGE_ENTRY[each].icon}</ListItemIcon>
              <ListItemText
                primary={i18n.t(PAGE_ENTRY[each].label)}
                slotProps={{ primary: { sx: { fontWeight: current ? 600 : undefined } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}

// The drawers' paper is a column: the foot sits at its bottom, below the pages.
const FOOT = { mt: "auto" } as const;

function SidePanel({
  footRef,
  ...props
}: NavigationProps & {
  readonly footRef: FootRef;
  readonly toggle: PipelinesToggle | undefined;
}) {
  return (
    <Box sx={{ width: PANEL_WIDTH_PX, flexShrink: 0 }}>
      <Drawer
        variant="permanent"
        sx={{ "& .MuiDrawer-paper": { width: PANEL_WIDTH_PX, boxSizing: "border-box" } }}
      >
        <Box component="nav">
          <PageList {...props} />
        </Box>
        <Box ref={footRef} sx={FOOT} />
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
  footRef,
  toggle,
  open,
  onOpenChange: setOpen,
}: NavigationProps & {
  readonly footRef: FootRef;
  readonly toggle: PipelinesToggle | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const drawerId = useId();
  const label = i18n.t("nav.menu");
  const touchFirst = useTouchFirst();
  // On the pipelines page a swipe is the pipelines' own: left goes back to this menu.
  useMenuSwipe({ active: touchFirst && toggle?.shown !== true, open, onOpenChange: setOpen });
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
        // Over a dialog that lets the menu's swipe through, such as a song's details.
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        slotProps={{ paper: { id: drawerId, sx: { width: PANEL_WIDTH_PX } } }}
      >
        <Box component="nav" aria-label={label}>
          <PageList page={page} onNavigate={pick} i18n={i18n} toggle={toggle} />
        </Box>
        <Box ref={footRef} sx={FOOT} />
      </Drawer>
    </>
  );
}
