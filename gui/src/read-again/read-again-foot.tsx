import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";

import { ReadAgainButton } from "../ui/read-again-button";

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
      <ReadAgainButton
        id="read-again"
        label={i18n.t("profile.readAgain")}
        canRead={canRead}
        reading={reading}
        onRead={onRead}
        onHeld={onHeld}
      />
    </Box>
  );
}
