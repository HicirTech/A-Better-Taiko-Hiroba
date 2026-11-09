import { Box, Drawer, IconButton, Paper } from "@mui/material";
import { useId } from "react";

import { NavigationLook } from "../theme/navigation-look";
import { MENU_INSET_PX, SAFE_TOP } from "../ui/frame-top";
import { MenuIcon } from "../ui/icons";
import { STILL } from "../ui/window-move";
import {
  BAND_BUTTON,
  type FootRef,
  HIDDEN_UNTIL_FOCUSED,
  type NavigationProps,
  PANEL_WIDTH_PX,
  type PipelinesToggle,
} from "./frame-parts";
import { NavigationFoot } from "./navigation-foot";
import { PageList } from "./page-list";
import type { Page } from "./pages";
import { useMenuSwipe } from "./use-menu-swipe";

export function MenuDrawer({
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
          ...BAND_BUTTON,
          left: `calc(${MENU_INSET_PX}px + env(safe-area-inset-left, 0px))`,
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
            paper: {
              id: drawerId,
              sx: { width: PANEL_WIDTH_PX, pt: SAFE_TOP, viewTransitionName: STILL.nav },
            },
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
          <NavigationFoot footRef={footRef} toggle={toggle} touchFirst={touchFirst} i18n={i18n} />
        </Drawer>
      </NavigationLook>
    </>
  );
}
