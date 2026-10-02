import { Box, CircularProgress, Paper } from "@mui/material";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  NO_PULL,
  PULL_THRESHOLD_PX,
  type PullState,
  pointOf,
  pullMoved,
  pullReleased,
  pullStarted,
} from "./pull-gesture";

/** The indicator's side: a small round sheet with the progress ring on it, as Android draws one. */
const INDICATOR_SIDE_PX = 40;

export interface PullToReadProps {
  /** Whether the screen is touch-first: only there does a pull read again. */
  readonly active: boolean;
  /** Whether a read may start now: none running, and no write open or running. */
  readonly canRead: boolean;
  readonly onRead: () => void;
}

/**
 * Pull-to-read, for a touch-first screen: pulled down from the top of the page (pull-gesture.ts),
 * a round indicator follows the finger, its ring filling on the way to the point where letting go
 * reads again; the page then says it is reading, as after the Fab. A pull starts anywhere on the
 * page's main region, but never on the navigation, whose touches never reach it, and never on a
 * box that scrolls and is not at its top, such as the costume's grid of items: a finger on it is
 * the box's to scroll back up. The indicator is for the eye alone: a screen reader reads again with
 * the Fab, kept for it.
 */
export function PullToRead({ active, canRead, onRead }: PullToReadProps) {
  const ref = useRef<HTMLDivElement>(null);
  /** How far the indicator is drawn down now: 0 with no pull. */
  const [distance, setDistance] = useState(0);
  const mayRead = useEffectEvent(() => canRead);
  const read = useEffectEvent(onRead);
  useEffect(() => {
    const region = ref.current?.closest("main");
    if (!active || region == null) {
      return;
    }
    let pull: PullState = NO_PULL;
    const show = (next: PullState) => {
      pull = next;
      setDistance(next.phase === "pulling" ? next.distancePx : 0);
    };
    const start = (event: TouchEvent) => {
      const finger = event.touches[0];
      show(
        finger === undefined
          ? NO_PULL
          : pullStarted(pointOf(finger), {
              fingers: event.touches.length,
              scrollTopPx: scrollTop() + scrolledWithin(event.target, region),
              enabled: mayRead(),
            }),
      );
    };
    const move = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (finger === undefined || pull.phase === "idle") {
        return;
      }
      show(pullMoved(pull, pointOf(finger), scrollTop()));
      // The finger draws the indicator: the page must not scroll or glow under it.
      if (pull.phase === "pulling" && event.cancelable) {
        event.preventDefault();
      }
    };
    const end = (event: TouchEvent) => {
      const reads = event.type === "touchend" && pullReleased(pull);
      show(NO_PULL);
      if (reads) {
        read();
      }
    };
    region.addEventListener("touchstart", start, { passive: true });
    region.addEventListener("touchmove", move, { passive: false });
    region.addEventListener("touchend", end);
    region.addEventListener("touchcancel", end);
    return () => {
      region.removeEventListener("touchstart", start);
      region.removeEventListener("touchmove", move);
      region.removeEventListener("touchend", end);
      region.removeEventListener("touchcancel", end);
      setDistance(0);
    };
  }, [active]);

  return (
    <Box ref={ref} sx={{ position: "relative", height: 0 }}>
      {active && <PullIndicator distance={distance} />}
    </Box>
  );
}

/**
 * The round indicator over the top of the page, `distance` below it, its ring full at the point
 * where letting go reads again. It follows the finger at once, and eases away once it lets go.
 */
function PullIndicator({ distance }: { distance: number }) {
  const pulling = distance > 0;
  return (
    <Box
      id="pull-indicator"
      aria-hidden
      sx={{
        position: "absolute",
        top: 0,
        left: "50%",
        zIndex: "appBar",
        pointerEvents: "none",
        opacity: pulling ? 1 : 0,
        transform: `translate(-50%, ${distance - INDICATOR_SIDE_PX}px)`,
        transition: (theme) =>
          pulling ? "none" : theme.transitions.create(["transform", "opacity"]),
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: INDICATOR_SIDE_PX,
          height: INDICATOR_SIDE_PX,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          size={24}
          variant="determinate"
          value={Math.min(100, (distance / PULL_THRESHOLD_PX) * 100)}
        />
      </Paper>
    </Box>
  );
}

/** How far the page is scrolled down now. */
function scrollTop(): number {
  return document.scrollingElement?.scrollTop ?? 0;
}

/**
 * How far the boxes between where a finger landed and the page's main region are scrolled down:
 * more than nothing when it landed in one that has scrolled, which the finger then scrolls back.
 */
function scrolledWithin(target: EventTarget | null, region: Element): number {
  let scrolled = 0;
  for (
    let box = target instanceof Element ? target : null;
    box !== null && box !== region;
    box = box.parentElement
  ) {
    scrolled += box.scrollTop;
  }
  return scrolled;
}
