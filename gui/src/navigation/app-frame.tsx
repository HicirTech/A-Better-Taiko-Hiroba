import { Box, Container, IconButton, Paper, Typography } from "@mui/material";
import {
  createContext,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { SystemBack } from "../platform";
import {
  BackClosersContext,
  BackModesContext,
  createBackClosers,
  OnScreenBackContext,
} from "../ui/back-closers";
import { BELOW_TOP_BAND, MENU_INSET_PX, PAGE_BOTTOM_PX, SAFE_TOP } from "../ui/frame-top";
import { ArrowBackIcon } from "../ui/icons";
import { MenuOpenContext, MenuOpenerContext } from "../ui/menu-open";
import { PipelinesShownContext } from "../ui/pipelines-shown";
import type { SwipeDirection } from "../ui/swipe-gesture";
import { VISUALLY_HIDDEN } from "../ui/visually-hidden";
import { WiderFrameContext } from "../ui/wider-frame";
import { moveWindow, STILL, WindowMoveStyles } from "../ui/window-move";
import { backAction } from "./back-action";
import { FrameNavigationContext } from "./frame-navigation";
import {
  BAND_BUTTON,
  type NavigationProps,
  PANEL_WIDTH_PX,
  type PipelinesToggle,
} from "./frame-parts";
import { MenuDrawer } from "./menu-drawer";
import type { Page } from "./pages";
import { SidePanel } from "./side-panel";
import { usePipelinesSwipe } from "./use-pipelines-swipe";

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
  back?: SystemBack | undefined;
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
  const press = (system: SystemBack) => {
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
  };
  const pressedBack = useEffectEvent(press);
  useEffect(() => back?.listen(() => pressedBack(back)), [back]);
  const modeOn = useSyncExternalStore(modes.subscribe, modes.isOpen);
  // An overlay lies over the button and takes the press first; an open menu has its own ways out.
  const backHere = backAction({ overlayOpen: false, pipelinesShown, menuOpen, modeOn, page });
  const backDrawn = back?.onScreen === true;
  const backShown = backDrawn && navigation && backHere !== "leave" && backHere !== "closeMenu";
  const onScreenBack = useMemo(
    () => ({ drawn: backDrawn, shown: backShown }),
    [backDrawn, backShown],
  );
  return (
    <OnScreenBackContext value={onScreenBack}>
      <BackClosersContext value={closers}>
        <MenuOpenContext value={menuOpen}>
          <MenuOpenerContext value={setMenuOpen}>
            <WindowMoveStyles />
            <Box aria-hidden sx={STATUS_BAR_ROOM} />
            {backShown && back !== undefined && (
              <Paper
                elevation={2}
                sx={{
                  ...BAND_BUTTON,
                  left: `calc(${wide ? PANEL_WIDTH_PX + MENU_INSET_PX : MENU_INSET_PX}px + env(safe-area-inset-left, 0px))`,
                  viewTransitionName: STILL.backButton,
                }}
              >
                <IconButton
                  id="nav-back"
                  aria-label={i18n.t("nav.back")}
                  title={i18n.t("nav.back")}
                  onClick={() => press(back)}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Paper>
            )}
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
                  sx={{ pt: BELOW_TOP_BAND, pb: `${PAGE_BOTTOM_PX}px` }}
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
    </OnScreenBackContext>
  );
}

// Where the system draws over the page, as iOS does, the page scrolls away beneath its words.
const STATUS_BAR_ROOM = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: SAFE_TOP,
  bgcolor: "background.default",
  zIndex: "appBar",
} as const;
