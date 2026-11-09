import { Box, Drawer } from "@mui/material";

import { NavigationLook } from "../theme/navigation-look";
import { STILL } from "../ui/window-move";
import {
  type FootRef,
  type NavigationProps,
  PANEL_WIDTH_PX,
  type PipelinesToggle,
} from "./frame-parts";
import { NavigationFoot } from "./navigation-foot";
import { PageList } from "./page-list";

export function SidePanel({
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
          <NavigationFoot
            footRef={footRef}
            toggle={props.toggle}
            touchFirst={touchFirst}
            i18n={props.i18n}
          />
        </Drawer>
      </NavigationLook>
    </Box>
  );
}
