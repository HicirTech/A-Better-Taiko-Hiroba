import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, IconButton, SvgIcon, Tooltip, Typography } from "@mui/material";

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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 3, pr: 1.5, py: 1.5 }}>
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

// Material's "refresh" icon (Apache 2.0), inline because the icons package is not a dependency.
export function RefreshIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
    </SvgIcon>
  );
}
