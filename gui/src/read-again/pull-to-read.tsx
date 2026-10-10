import { Box, CircularProgress, Paper } from "@mui/material";
import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";

import { gesturesHeld } from "../navigation/gesture-hold";
import {
  NO_PULL,
  PULL_THRESHOLD_PX,
  type PullState,
  pointOf,
  pullHoldsThePage,
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
  /** A box that scrolls on its own, such as a dialog's, pulled in place of the page. */
  readonly region?: RefObject<HTMLElement | null>;
  /** The indicator's id: a dialog's pull draws one beside the page's. */
  readonly id?: string;
}

export function PullToRead({
  active,
  canRead,
  onRead,
  region,
  id = "pull-indicator",
}: PullToReadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const mayRead = useEffectEvent(() => canRead);
  const read = useEffectEvent(onRead);
  useEffect(() => {
    const box = region?.current ?? null;
    const area = box ?? ref.current?.closest("main");
    if (!active || area == null) {
      return;
    }
    const scrollTop = () => (box === null ? pageScrollTop() : box.scrollTop);
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
              scrollTopPx: scrollTop(),
              enabled: mayRead(),
            }),
      );
    };
    const move = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (finger === undefined || pull.phase === "idle") {
        return;
      }
      if (gesturesHeld()) {
        show(NO_PULL);
        return;
      }
      const at = pointOf(finger);
      show(pullMoved(pull, at, scrollTop()));
      // From the first move down, or a long page's WebView stretches it before the pull is decided.
      if (pullHoldsThePage(pull, at) && event.cancelable) {
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
    area.addEventListener("touchstart", start, { passive: true });
    area.addEventListener("touchmove", move, { passive: false });
    area.addEventListener("touchend", end);
    area.addEventListener("touchcancel", end);
    return () => {
      area.removeEventListener("touchstart", start);
      area.removeEventListener("touchmove", move);
      area.removeEventListener("touchend", end);
      area.removeEventListener("touchcancel", end);
      setDistance(0);
    };
  }, [active, region]);

  return (
    <Box ref={ref} sx={{ position: "relative", height: 0 }}>
      {active && <PullIndicator id={id} distance={distance} />}
    </Box>
  );
}

function PullIndicator({ id, distance }: { id: string; distance: number }) {
  const pulling = distance > 0;
  return (
    <Box
      id={id}
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

function pageScrollTop(): number {
  return document.scrollingElement?.scrollTop ?? 0;
}
