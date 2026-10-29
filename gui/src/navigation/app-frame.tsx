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
  type Theme,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  createContext,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { SystemBack } from "../platform";
import { NavigationLook } from "../theme/navigation-look";
import { BackClosersContext, BackModesContext, createBackClosers } from "../ui/back-closers";
import { MENU_INSET_PX, PAGE_BOTTOM_PX, SAFE_TOP, TOP_BAND_PX } from "../ui/frame-top";
import { ArrowBackIcon, ArrowForwardIcon, MenuIcon, QrCodeScannerIcon } from "../ui/icons";
import { MenuOpenContext, MenuOpenerContext } from "../ui/menu-open";
import { PipelinesShownContext } from "../ui/pipelines-shown";
import type { SwipeDirection } from "../ui/swipe-gesture";
import { VISUALLY_HIDDEN } from "../ui/visually-hidden";
import { WiderFrameContext } from "../ui/wider-frame";
import { MOVE_TIMING, moveWindow, STILL, WindowMoveStyles } from "../ui/window-move";
import { backAction } from "./back-action";
import { FrameNavigationContext } from "./frame-navigation";
import { PAGES, type Page } from "./pages";
import { useMenuSwipe } from "./use-menu-swipe";
import { usePipelinesSwipe } from "./use-pipelines-swipe";

/** How the navigation lists a page: its name and its icon. */
export interface NavEntry {
  readonly label: MessageKey;
  readonly icon: ReactNode;
}

const PANEL_WIDTH_PX = 240;

interface NavigationProps {
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  readonly i18n: Translator;
  /** Every page, as the navigation lists it. */
  readonly pages: Readonly<Record<Page, NavEntry>>;
  /** Opens the scanner from beside the app's name; none leaves the panel without it. */
  readonly onScan?: (() => void) | undefined;
}

/** The way to the pipelines page from the pages' list, where there is one. */
interface PipelinesToggle {
  readonly shown: boolean;
  readonly onShownChange: (shown: boolean) => void;
}

/** Where the navigation's foot is drawn, while there is one to draw it in. */
type FootRef = (foot: HTMLElement | null) => void;
/** The navigation's foot, where the window's root draws; none while it is shut. */
export const NavFootContext = createContext<HTMLElement | null>(null);

export function AppFrame({
  page,
  onNavigate,
  i18n,
  pages,
  onScan,
  wide,
  touchFirst,
  back,
  pipelines,
  children,
}: NavigationProps & {
  /** Wide enough for the side panel, which stays open beside the page. */
  wide: boolean;
  /** A touch screen: swipes open the menu and the pipelines page. */
  touchFirst: boolean;
  back?: SystemBack;
  /** The page one level past the menu; without it there is no way there. */
  pipelines?: ReactNode;
  children: ReactNode;
}) {
  const [wider, setWider] = useState(false);
  const [navigation, setNavigation] = useState(true);
  const [foot, setFoot] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // The page the pipelines page was opened over, while it is shown.
  const [pipelinesOver, setPipelinesOver] = useState<Page | null>(null);
  // Shut a menu left open on a wide window, or by a sign-out, so it does not reopen unasked.
  if ((wide || !navigation) && menuOpen) {
    setMenuOpen(false);
  }
  // A sign-out takes the pipelines page with the menu, and going to another page takes it too.
  if (pipelinesOver !== null && (!navigation || pipelinesOver !== page)) {
    setPipelinesOver(null);
  }
  const pipelinesShown = pipelinesOver !== null;
  // The page under the pipelines page goes back to where it was scrolled.
  const pageScroll = useRef(0);
  useLayoutEffect(() => {
    if (!pipelinesShown) {
      window.scrollTo(0, pageScroll.current);
    }
  }, [pipelinesShown]);
  const showPipelines = (shown: boolean, menuAfter = false) => {
    if (shown) {
      pageScroll.current = window.scrollY;
    }
    moveWindow(shown ? "pipelinesIn" : "pipelinesOut", () => {
      if (shown) {
        window.scrollTo(0, 0);
      }
      setMenuOpen(menuAfter);
      setPipelinesOver(shown ? page : null);
    });
  };
  const navigate = (next: Page) => {
    // The page under the pipelines page: back to it as it was, as the arrow goes.
    if (pipelinesShown && next === page) {
      showPipelines(false);
      return;
    }
    pageScroll.current = 0;
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
      // Back from the pipelines page is the menu it was reached from.
      showPipelines(direction === "right", direction === "left" && !wide);
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
      showPipelines(false, !wide);
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
        <MenuOpenerContext value={setMenuOpen}>
          <WindowMoveStyles />
          <Box sx={{ display: "flex", minHeight: "100vh" }}>
            {navigation &&
              (wide ? (
                <SidePanel
                  page={page}
                  onNavigate={navigate}
                  i18n={i18n}
                  pages={pages}
                  onScan={onScan}
                  touchFirst={touchFirst}
                  footRef={setFoot}
                  toggle={toggle}
                />
              ) : (
                <MenuDrawer
                  page={page}
                  onNavigate={navigate}
                  i18n={i18n}
                  pages={pages}
                  onScan={onScan}
                  touchFirst={touchFirst}
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
                  {i18n.t(pipelinesShown ? "nav.pipelines" : pages[page].label)}
                </Typography>
                {/* Kept, only hidden, under the pipelines page: going back reads nothing again. */}
                <Box hidden={pipelinesShown}>
                  <WiderFrameContext value={setWider}>
                    <FrameNavigationContext value={setNavigation}>
                      <NavFootContext value={foot}>
                        <PipelinesShownContext value={pipelinesShown}>
                          <BackModesContext value={modes}>{children}</BackModesContext>
                        </PipelinesShownContext>
                      </NavFootContext>
                    </FrameNavigationContext>
                  </WiderFrameContext>
                </Box>
                {pipelines !== undefined && pipelinesShown && <Box>{pipelines}</Box>}
              </Container>
            </Box>
          </Box>
        </MenuOpenerContext>
      </MenuOpenContext>
    </BackClosersContext>
  );
}

/** A page row's shape: flush with the panel's left edge, round at the right. */
const ROW_SHAPE = { mr: 1.5, borderRadius: "0 999px 999px 0" } as const;

/** A row's hover fades as MUI's does; its words change colour as the highlight travels to it. */
const rowChange = (theme: Theme) => {
  const hover = theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest,
  });
  return `${hover}, color ${MOVE_TIMING}`;
};

/** Where the current page's row lies in the list. */
interface RowPlace {
  readonly top: number;
  readonly height: number;
}

function PageList({
  page,
  onNavigate,
  i18n,
  pages,
  onScan,
  toggle,
}: NavigationProps & { readonly toggle: PipelinesToggle | undefined }) {
  const scanLabel = i18n.t("scan.button");
  const list = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<RowPlace | null>(null);
  // Measured after every render: a label in another language can take two lines.
  useLayoutEffect(() => {
    const row = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const next = row == null ? null : { top: row.offsetTop, height: row.offsetHeight };
    setPlace((now) => (now?.top === next?.top && now?.height === next?.height ? now : next));
  });
  return (
    <>
      <Box
        sx={{
          pl: 3,
          pr: onScan === undefined ? 3 : 1.5,
          pt: 2.5,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          component="p"
          variant="subtitle2"
          color="text.secondary"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          {i18n.t("app.title")}
        </Typography>
        {onScan !== undefined && (
          // Its own row's height: the button reaches into the room over and under the words.
          <IconButton
            id="scan"
            aria-label={scanLabel}
            title={scanLabel}
            onClick={onScan}
            sx={{ my: -1 }}
          >
            <QrCodeScannerIcon />
          </IconButton>
        )}
      </Box>
      <List ref={list} disablePadding>
        {place !== null && (
          // The highlight travels to the new page's row as the page moves.
          <Box
            aria-hidden
            sx={(theme) => ({
              ...ROW_SHAPE,
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: place.height,
              transform: `translateY(${place.top}px)`,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
              transition: `transform ${MOVE_TIMING}, height ${MOVE_TIMING}`,
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              pointerEvents: "none",
            })}
          />
        )}
        {PAGES.map((each) => {
          const current = toggle?.shown !== true && each === page;
          return (
            <ListItemButton
              key={each}
              id={`nav-${each}`}
              selected={current}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(each)}
              sx={{
                ...ROW_SHAPE,
                transition: rowChange,
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "transparent" },
              }}
            >
              <ListItemIcon>{pages[each].icon}</ListItemIcon>
              <ListItemText
                primary={i18n.t(pages[each].label)}
                slotProps={{
                  primary: { sx: { fontWeight: current ? "fontWeightBold" : undefined } },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}

/** The navigation's foot: the way to the pipelines page, then what the app puts there. */
function Foot({
  footRef,
  toggle,
  touchFirst,
  i18n,
}: {
  readonly footRef: FootRef;
  readonly toggle: PipelinesToggle | undefined;
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const label = i18n.t("nav.pipelines");
  return (
    <Box
      sx={{
        mt: "auto",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: toggle !== undefined && !touchFirst ? 1.5 : 3,
        pr: 1.5,
        py: 1.5,
      }}
    >
      {toggle !== undefined && (
        // The pipelines page lies one level past the pages, to the left: the arrow says which way.
        // A touch screen draws no arrow, as it draws no menu button: its swipe stands in for it.
        <Box sx={touchFirst ? HIDDEN_UNTIL_FOCUSED : undefined}>
          <IconButton
            id="nav-pipelines"
            size="small"
            aria-label={label}
            title={label}
            aria-pressed={toggle.shown}
            onClick={() => toggle.onShownChange(!toggle.shown)}
          >
            {toggle.shown ? <ArrowForwardIcon /> : <ArrowBackIcon />}
          </IconButton>
        </Box>
      )}
      <Box ref={footRef} sx={{ flexGrow: 1, minWidth: 0 }} />
    </Box>
  );
}

function SidePanel({
  footRef,
  touchFirst,
  ...props
}: NavigationProps & {
  readonly footRef: FootRef;
  readonly toggle: PipelinesToggle | undefined;
  readonly touchFirst: boolean;
}) {
  return (
    <Box sx={{ width: PANEL_WIDTH_PX, flexShrink: 0 }}>
      <NavigationLook>
        <Drawer
          variant="permanent"
          sx={{
            "& .MuiDrawer-paper": {
              width: PANEL_WIDTH_PX,
              boxSizing: "border-box",
              viewTransitionName: STILL.nav,
            },
          }}
        >
          <Box component="nav">
            <PageList {...props} />
          </Box>
          <Foot footRef={footRef} toggle={props.toggle} touchFirst={touchFirst} i18n={props.i18n} />
        </Drawer>
      </NavigationLook>
    </Box>
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
  pages,
  onScan,
  footRef,
  toggle,
  touchFirst,
  open,
  onOpenChange: setOpen,
}: NavigationProps & {
  readonly footRef: FootRef;
  readonly toggle: PipelinesToggle | undefined;
  readonly touchFirst: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const drawerId = useId();
  const label = i18n.t("nav.menu");
  // On the pipelines page a swipe is the pipelines' own: left goes back to this menu.
  useMenuSwipe({ active: touchFirst && toggle?.shown !== true, open, onOpenChange: setOpen });
  const pick = (next: Page) => {
    setOpen(false);
    onNavigate(next);
  };
  // The scanner opens over the page, where the menu would stand above it.
  const scan =
    onScan === undefined
      ? undefined
      : () => {
          setOpen(false);
          onScan();
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
          viewTransitionName: STILL.menuButton,
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
      <NavigationLook>
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          // Over a dialog that lets the menu's swipe through, such as a song's details.
          sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
          slotProps={{
            paper: { id: drawerId, sx: { width: PANEL_WIDTH_PX, viewTransitionName: STILL.nav } },
            backdrop: { sx: { viewTransitionName: STILL.scrim } },
          }}
        >
          <Box component="nav" aria-label={label}>
            <PageList
              page={page}
              onNavigate={pick}
              i18n={i18n}
              pages={pages}
              onScan={scan}
              toggle={toggle}
            />
          </Box>
          <Foot footRef={footRef} toggle={toggle} touchFirst={touchFirst} i18n={i18n} />
        </Drawer>
      </NavigationLook>
    </>
  );
}
