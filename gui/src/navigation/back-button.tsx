import type { Translator } from "@abth/i18n";
import { IconButton, Paper } from "@mui/material";

import { MENU_INSET_PX } from "../ui/frame-top";
import { ArrowBackIcon } from "../ui/icons";
import { STILL } from "../ui/window-move";
import { BAND_BUTTON, PANEL_WIDTH_PX } from "./frame-parts";

/** Back drawn at the band's left, past a wide window's side panel, where the phone has none. */
export function BackButton({
  wide,
  i18n,
  onPress,
}: {
  readonly wide: boolean;
  readonly i18n: Translator;
  readonly onPress: () => void;
}) {
  return (
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
        onClick={onPress}
      >
        <ArrowBackIcon />
      </IconButton>
    </Paper>
  );
}
