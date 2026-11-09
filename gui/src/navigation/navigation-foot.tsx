import type { Translator } from "@abth/i18n";
import { Box, IconButton } from "@mui/material";

import { ArrowBackIcon, ArrowForwardIcon } from "../ui/icons";
import { type FootRef, HIDDEN_UNTIL_FOCUSED, type PipelinesToggle } from "./frame-parts";

/** The navigation's foot: the way to the pipelines page, then what the app puts there. */
export function NavigationFoot({
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
