import { CircularProgress, type SxProps, type Theme } from "@mui/material";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { LONG_HOLD_MS } from "./pull-gesture";

const TICK_MS = 100;

/** A ring that fills as a long hold goes on, from `since`. */
export function HoldRing({
  since,
  size,
  sx,
}: {
  readonly since: number;
  readonly size: number;
  readonly sx?: SxProps<Theme>;
}) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);
  return (
    <CircularProgress
      variant="determinate"
      color="warning"
      size={size}
      value={Math.min(100, ((now - since) / LONG_HOLD_MS) * 100)}
      aria-hidden
      sx={sx}
    />
  );
}

/** A button's long hold: `onHeld` once a press lasts LONG_HOLD_MS, and no click from its end. */
export function usePressHold(onHeld: (() => void) | undefined) {
  const [since, setSince] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);
  const latest = useRef(onHeld);
  useEffect(() => {
    latest.current = onHeld;
  });
  useEffect(() => () => clearTimeout(timer.current), []);
  const stop = () => {
    clearTimeout(timer.current);
    setSince(null);
  };
  return {
    since,
    /** Whether a click ends a hold that asked already: it reads nothing then. */
    endsAHold: () => {
      const was = held.current;
      held.current = false;
      return was;
    },
    handlers:
      onHeld === undefined
        ? {}
        : {
            onPointerDown: (event: PointerEvent) => {
              held.current = false;
              if (event.button !== 0) {
                return;
              }
              setSince(Date.now());
              timer.current = setTimeout(() => {
                setSince(null);
                held.current = true;
                latest.current?.();
              }, LONG_HOLD_MS);
            },
            onPointerUp: stop,
            onPointerLeave: stop,
            onPointerCancel: stop,
            // What the hold asked for took the focus: the press ends there, with no click here.
            onBlur: () => {
              held.current = false;
            },
          },
  };
}
