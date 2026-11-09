import { Box, Container, Typography } from "@mui/material";
import { createContext, type ReactNode, useState } from "react";

import type { SystemBack } from "../platform";
import { BackClosersContext, BackModesContext, OnScreenBackContext } from "../ui/back-closers";
import { BELOW_TOP_BAND, PAGE_BOTTOM_PX, SAFE_TOP } from "../ui/frame-top";
import { MenuOpenContext, MenuOpenerContext } from "../ui/menu-open";
import { PipelinesShownContext } from "../ui/pipelines-shown";
import type { SwipeDirection } from "../ui/swipe-gesture";
import { VISUALLY_HIDDEN } from "../ui/visually-hidden";
import { WiderFrameContext } from "../ui/wider-frame";
import { WindowMoveStyles } from "../ui/window-move";
import { BackButton } from "./back-button";
import { FrameNavigationContext } from "./frame-navigation";
import { type NavigationProps, PANEL_WIDTH_PX, type PipelinesToggle } from "./frame-parts";
import { MenuDrawer } from "./menu-drawer";
import { SidePanel } from "./side-panel";
import { useFrameBack } from "./use-frame-back";
import { usePipelinesPage } from "./use-pipelines-page";
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
  // Shut a menu left open on a wide window, or by a sign-out, so it does not reopen unasked.
  if ((wide || !navigation) && menuOpen) {
    setMenuOpen(false);
  }
  const { pipelinesShown, showPipelines, navigate } = usePipelinesPage({
    page,
    navigation,
    onNavigate,
    setMenuOpen,
  });
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
  const { closers, modes, onScreenBack, press } = useFrameBack({
    back,
    page,
    pipelinesShown,
    menuOpen,
    wide,
    navigation,
    showPipelines,
    setMenuOpen,
    onNavigate,
  });
  return (
    <OnScreenBackContext value={onScreenBack}>
      <BackClosersContext value={closers}>
        <MenuOpenContext value={menuOpen}>
          <MenuOpenerContext value={setMenuOpen}>
            <WindowMoveStyles />
            <Box aria-hidden sx={STATUS_BAR_ROOM} />
            {onScreenBack.shown && back !== undefined && (
              <BackButton wide={wide} i18n={i18n} onPress={() => press(back)} />
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
