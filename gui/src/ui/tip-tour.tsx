import type { Translator } from "@abth/i18n";
import { Box, Button, Paper, Popper, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useEffect, useEffectEvent, useRef } from "react";

import { useBackCloses } from "./back-closers";
import { useBox, useFound, useOverTarget } from "./tip-geometry";
import { type TipStep, useTour } from "./tip-tour-state";

export interface TipTourProps {
  /** The tips to go through, one bubble each; a tip gone past leaves them. */
  readonly steps: readonly TipStep[];
  readonly i18n: Translator;
  /** Tips gone past: one by Next or Got it, the rest at once by Skip, Escape or Back. */
  readonly onSeen: (ids: readonly string[]) => void;
  /** Opens what a tip shows, and shuts it with null once the tip is gone past. */
  readonly onScene?: (scene: string | null) => void;
}

const RING_ROOM_PX = 4;
const ARROW_PX = 16;
/** How far the arrow stands out of the bubble: half its square's diagonal. */
const ARROW_DEPTH_PX = ARROW_PX / Math.SQRT2;
// Drawn as MUI's tooltip draws its arrow: the placement moves the box, so the turn is the
// square inside it, cut in half by the box.
const ARROW = {
  position: "absolute",
  overflow: "hidden",
  width: ARROW_PX,
  height: ARROW_DEPTH_PX,
  boxSizing: "border-box",
  "&::before": {
    content: '""',
    display: "block",
    width: 1,
    height: 1,
    m: "auto",
    // The bubble's own ground, its elevation's overlay in dark mode too.
    bgcolor: "background.paper",
    backgroundImage: "var(--Paper-overlay)",
    transform: "rotate(45deg)",
  },
} as const;
const OUT = `${-ARROW_DEPTH_PX}px`;
const ARROW_SIDES = {
  '&[data-popper-placement^="bottom"] .tip-arrow': {
    top: 0,
    marginTop: OUT,
    "&::before": { transformOrigin: "0 100%" },
  },
  '&[data-popper-placement^="top"] .tip-arrow': {
    bottom: 0,
    marginBottom: OUT,
    "&::before": { transformOrigin: "100% 0" },
  },
  '&[data-popper-placement^="right"] .tip-arrow': {
    left: 0,
    marginLeft: OUT,
    width: ARROW_DEPTH_PX,
    height: ARROW_PX,
    "&::before": { transformOrigin: "100% 100%" },
  },
  '&[data-popper-placement^="left"] .tip-arrow': {
    right: 0,
    marginRight: OUT,
    width: ARROW_DEPTH_PX,
    height: ARROW_PX,
    "&::before": { transformOrigin: "0 0" },
  },
} as const;
const BUBBLE_MAX_PX = 320;
/** Where a bubble that points at nothing stands: under the window's top band. */
const TOP_PX = 72;

// The menu drawer stands over dialogs (modal + 1); the dim and the ring stand over it.
const overTheMenu = (theme: Theme) => theme.zIndex.modal + 2;

/** A tour of tips, one bubble at a time over the page, the rest of the window dimmed. */
export function TipTour({ steps, i18n, onSeen, onScene }: TipTourProps) {
  const { t } = i18n;
  const { shown, count, next, skip } = useTour(steps, onSeen);
  const open = shown !== null;
  const found = useFound(shown?.step);
  const shows = useEffectEvent((scene: string | null) => onScene?.(scene));
  const scene = shown?.step.scene;
  useEffect(() => {
    if (scene === undefined) {
      return;
    }

    shows(scene);
    return () => shows(null);
  }, [scene]);
  const element = found.kind === "at" ? found.element : null;
  const box = useBox(element);
  const bubble = useRef<HTMLDivElement>(null);
  const overTarget = useOverTarget(bubble, box);
  useBackCloses(open, skip);
  const skipped = useEffectEvent(skip);
  useEffect(() => {
    if (!open) {
      return;
    }

    const escaped = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skipped();
      }
    };
    window.addEventListener("keydown", escaped);
    return () => window.removeEventListener("keydown", escaped);
  }, [open]);
  if (shown === null || found.kind === "seeking") {
    return null;
  }

  const { step, at } = shown;
  const last = at === count - 1;
  const wordsId = "tip-words";
  const anchor = element ?? {
    getBoundingClientRect: () => new DOMRect(window.innerWidth / 2, TOP_PX, 0, 0),
  };
  return (
    <>
      <Box
        id="tip-tour"
        sx={(theme) => ({
          position: "fixed",
          inset: 0,
          zIndex: overTheMenu(theme),
          bgcolor: box === null ? alpha(theme.palette.common.black, 0.5) : "transparent",
        })}
      />
      {box !== null && (
        <Box
          id="tip-ring"
          aria-hidden
          sx={(theme) => ({
            position: "fixed",
            left: box.left - RING_ROOM_PX,
            top: box.top - RING_ROOM_PX,
            width: box.width + 2 * RING_ROOM_PX,
            height: box.height + 2 * RING_ROOM_PX,
            zIndex: overTheMenu(theme),
            border: 2,
            borderColor: "primary.main",
            borderRadius: 1,
            boxShadow: `0 0 0 100vmax ${alpha(theme.palette.common.black, 0.5)}`,
            pointerEvents: "none",
          })}
        />
      )}
      <Popper
        open
        anchorEl={anchor}
        placement="bottom"
        modifiers={[
          { name: "offset", options: { offset: [0, ARROW_PX + RING_ROOM_PX] } },
          { name: "arrow", enabled: element !== null, options: { element: ".tip-arrow" } },
          { name: "flip", options: { fallbackPlacements: ["top", "left", "right"] } },
          // A target as tall as the window leaves no room beside it: the bubble stays on screen,
          // over it, so Next can always be pressed.
          {
            name: "preventOverflow",
            options: { padding: 8, altAxis: true, tether: false },
          },
        ]}
        sx={{ zIndex: "tooltip", ...ARROW_SIDES }}
      >
        <Paper
          ref={bubble}
          id="tip-bubble"
          role="dialog"
          aria-label={t("tips.label")}
          aria-describedby={wordsId}
          data-tip={step.id}
          elevation={8}
          sx={{ position: "relative", p: 2, maxWidth: BUBBLE_MAX_PX }}
        >
          {element !== null && overTarget === false && <Box className="tip-arrow" sx={ARROW} />}
          <Typography id={wordsId} variant="body2">
            {step.words}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", flexGrow: 1 }}>
              {t("tips.step", { step: at + 1, count })}
            </Typography>
            <Button id="tip-skip" size="small" onClick={skip}>
              {t("tips.skip")}
            </Button>
            <Button id="tip-next" size="small" variant="contained" autoFocus onClick={next}>
              {t(last ? "tips.done" : "tips.next")}
            </Button>
          </Stack>
        </Paper>
      </Popper>
    </>
  );
}
