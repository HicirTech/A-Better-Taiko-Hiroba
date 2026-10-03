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

const INDICATOR_SIDE_PX = 40;

export interface PullToReadProps {
  /** Whether the screen is touch-first: only there does a pull read again. */
  readonly active: boolean;
  readonly canRead: boolean;
  readonly onRead: () => void;
}

export function PullToRead({ active, canRead, onRead }: PullToReadProps) {
  const ref = useRef<HTMLDivElement>(null);
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

function scrollTop(): number {
  return document.scrollingElement?.scrollTop ?? 0;
}

// A finger on a box that has scrolled, such as the costume grid, is that box's to scroll back up.
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
