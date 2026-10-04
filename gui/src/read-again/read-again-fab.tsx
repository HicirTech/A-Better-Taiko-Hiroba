import type { Translator } from "@abth/i18n";
import { CircularProgress, Fab, SvgIcon, Tooltip } from "@mui/material";

import { VISUALLY_HIDDEN } from "../my-page/hiroba-px";

export interface ReadAgainFabProps {
  readonly reading: boolean;
  readonly canRead: boolean;
  /** Where a pull reads again, the Fab shows on keyboard focus only; screen readers keep it. */
  readonly touchFirst: boolean;
  readonly onRead: () => void;
  readonly i18n: Translator;
}

export function ReadAgainFab({ reading, canRead, touchFirst, onRead, i18n }: ReadAgainFabProps) {
  const label = i18n.t("profile.readAgain");
  return (
    // None while it is shut: a disabled button sends no event to open or close it.
    <Tooltip title={canRead ? label : ""}>
      <Fab
        id="read-again"
        size="small"
        color="primary"
        aria-label={label}
        disabled={!canRead}
        onClick={onRead}
        sx={touchFirst ? { "&:not(.Mui-focusVisible)": VISUALLY_HIDDEN } : undefined}
      >
        {/* In the theme's colour, not the Fab's: shut, the Fab's own is too faint to see spin. */}
        {reading ? <CircularProgress size={20} aria-hidden /> : <RefreshIcon />}
      </Fab>
    </Tooltip>
  );
}

// Material's "refresh" icon (Apache 2.0), inline because the icons package is not a dependency.
function RefreshIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
    </SvgIcon>
  );
}
