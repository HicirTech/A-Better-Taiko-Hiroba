import { CircularProgress, IconButton, Tooltip } from "@mui/material";

import { HoldRing, usePressHold } from "../read-again/long-hold";
import { RefreshIcon } from "./icons";

// The arrow is MUI's own icon size; the spinner, a little smaller, stands in the arrow's room.
const ARROW_PX = 24;
const SPINNER_PX = 20;
const IN_THE_ARROWS_ROOM = { m: `${(ARROW_PX - SPINNER_PX) / 2}px` } as const;
const RING_PX = 36;
const RING = { position: "absolute", top: 2, left: 2 } as const;

/** The app's way to read something again: an arrow, a spinner while it reads, a hold for more. */
export function ReadAgainButton({
  id,
  label,
  canRead,
  reading,
  onRead,
  onHeld,
}: {
  readonly id: string;
  /** What it reads again, as its tooltip and screen readers say it. */
  readonly label: string;
  /** Shut while it cannot read: grey, with no tooltip. */
  readonly canRead: boolean;
  /** Its read is running: a spinner stands where the arrow was. */
  readonly reading: boolean;
  readonly onRead: () => void;
  /** Where a long hold asks for more, such as every score read again. */
  readonly onHeld?: (() => void) | undefined;
}) {
  const hold = usePressHold(canRead ? onHeld : undefined);
  return (
    // None while it is shut: a disabled button sends no event to open or close it.
    <Tooltip title={canRead ? label : ""}>
      <IconButton
        id={id}
        aria-label={label}
        disabled={!canRead}
        onClick={() => {
          if (!hold.endsAHold()) {
            onRead();
          }
        }}
        {...hold.handlers}
      >
        {reading ? (
          <CircularProgress size={SPINNER_PX} aria-hidden sx={IN_THE_ARROWS_ROOM} />
        ) : (
          <RefreshIcon />
        )}
        {hold.since !== null && <HoldRing since={hold.since} size={RING_PX} sx={RING} />}
      </IconButton>
    </Tooltip>
  );
}
