import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";

import { RefreshIcon } from "../ui/icons";
import { HoldRing, usePressHold } from "./long-hold";

export interface ReadAgainFootProps {
  readonly reading: boolean;
  readonly canRead: boolean;
  /** When the page shown was read; null before the first read. */
  readonly fetchedAt: Date | number | string | null;
  /** Replaces the time while a walk is on a page, such as a recent-plays read. */
  readonly progress?: string | null;
  readonly onRead: () => void;
  /** Where a page reads more by a long hold: the button held that long asks for it. */
  readonly onHeld?: (() => void) | undefined;
  readonly i18n: Translator;
}

// The time keeps to one line, so a narrow column breaks the words before it instead.
const unbroken = (text: string) => text.replaceAll(" ", " ");

/** At the foot of the navigation: when the page was last read, and the way to read it again. */
export function ReadAgainFoot({
  reading,
  canRead,
  fetchedAt,
  progress,
  onRead,
  onHeld,
  i18n,
}: ReadAgainFootProps) {
  const label = i18n.t("profile.readAgain");
  const hold = usePressHold(canRead ? onHeld : undefined);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography
        id="nav-last-updated"
        variant="caption"
        color="text.secondary"
        sx={{ flexGrow: 1, minWidth: 0 }}
      >
        {progress != null && progress !== ""
          ? progress
          : fetchedAt !== null &&
            i18n.t("profile.fetchedAt", { time: unbroken(i18n.dateTime(fetchedAt)) })}
      </Typography>
      {/* None while it is shut: a disabled button sends no event to open or close it. */}
      <Tooltip title={canRead ? label : ""}>
        <IconButton
          id="read-again"
          aria-label={label}
          disabled={!canRead}
          onClick={() => {
            if (!hold.endsAHold()) {
              onRead();
            }
          }}
          {...hold.handlers}
        >
          {reading ? <CircularProgress size={20} aria-hidden /> : <RefreshIcon />}
          {hold.since !== null && (
            <HoldRing since={hold.since} size={36} sx={{ position: "absolute", top: 2, left: 2 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
