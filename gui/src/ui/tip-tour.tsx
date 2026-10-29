import type { Translator } from "@abth/i18n";
import { Box, Button, Paper, Popper, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";

import { useBackCloses } from "./back-closers";

/** A tip as its bubble shows it: where it points, the first found, and its words. */
export interface TipStep {
  readonly id: string;
  /** Selectors tried in order; none: the bubble stands at the window's top, pointing at nothing. */
  readonly at: readonly string[];
  readonly words: string;
  /** What the tip opens to show what it tells, through `onScene`, shut again after it. */
  readonly scene?: string | undefined;
}

export interface TipTourProps {
  /** The tips to go through, one bubble each; a tip gone past leaves them. */
  readonly steps: readonly TipStep[];
  readonly i18n: Translator;
  /** Tips gone past: one by Next or Got it, the rest at once by Skip, Escape or Back. */
  readonly onSeen: (ids: readonly string[]) => void;
  /** Opens what a tip shows, and shuts it with null once the tip is gone past. */
  readonly onScene?: (scene: string | null) => void;
}

/** How long a tip waits for what it points at to be drawn; then it stands at the top. */
const FIND_WITHIN_MS = 2000;
const FIND_EVERY_MS = 200;
/** What a tip opens moves first, a drawer sliding or a card unfolding: then it is pointed at. */
const SCENE_OPENS_MS = 300;
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

type Found =
  | { readonly kind: "seeking" }
  | { readonly kind: "at"; readonly element: Element | null };

const shownBox = (element: Element | null) => {
  const box = element?.getBoundingClientRect();
  return box !== undefined && box.width > 0 && box.height > 0;
};

const firstShown = (at: readonly string[]) =>
  at.map((selector) => document.querySelector(selector)).find(shownBox) ?? null;

/** What `step` points at, scrolled into view; nothing where it points at nothing drawn in time. */
function useFound(step: TipStep | undefined): Found {
  const [found, setFound] = useState<Found>({ kind: "seeking" });
  useEffect(() => {
    setFound({ kind: "seeking" });
    if (step === undefined) {
      return;
    }
    if (step.at.length === 0) {
      setFound({ kind: "at", element: null });
      return;
    }

    const since = Date.now();
    let timer = 0;
    const seek = () => {
      const element = firstShown(step.at);
      if (element !== null) {
        element.scrollIntoView({ block: "center", behavior: "instant" });
        setFound({ kind: "at", element });
      } else if (Date.now() - since < FIND_WITHIN_MS) {
        timer = window.setTimeout(seek, FIND_EVERY_MS);
      } else {
        setFound({ kind: "at", element: null });
      }
    };
    timer = window.setTimeout(seek, step.scene === undefined ? 0 : SCENE_OPENS_MS);
    return () => window.clearTimeout(timer);
  }, [step]);
  return found;
}

/** The box of `element` on the window, kept as the page scrolls or the window resizes. */
function useBox(element: Element | null): DOMRect | null {
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (element === null) {
      setBox(null);
      return;
    }

    const measure = () => setBox(element.getBoundingClientRect());
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [element]);
  return box;
}

/** Whether the bubble stands over `box`, pushed there by a target as tall as the window: then an
 * arrow would point nowhere. Read a frame after the bubble is placed. */
function useOverTarget(bubble: { readonly current: HTMLElement | null }, box: DOMRect | null) {
  // Unknown until measured: no arrow meanwhile, rather than one that may point nowhere.
  const [over, setOver] = useState<boolean | null>(null);
  useEffect(() => {
    setOver(null);
    const frame = window.requestAnimationFrame(() => {
      const at = bubble.current?.getBoundingClientRect();
      setOver(
        box !== null &&
          at !== undefined &&
          at.top < box.bottom &&
          at.bottom > box.top &&
          at.left < box.right &&
          at.right > box.left,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bubble, box]);
  return over;
}

/** A tour of tips, one bubble at a time over the page, the rest of the window dimmed. */
export function TipTour({ steps, i18n, onSeen, onScene }: TipTourProps) {
  const { t } = i18n;
  const [tour, setTour] = useState<readonly TipStep[]>(steps);
  const [index, setIndex] = useState(0);
  const inTour = (id: string) => tour.some((step) => step.id === id);
  // Tips gone past only shorten the steps; one the tour lacks starts it again.
  if (steps.some(({ id }) => !inTour(id))) {
    setTour(steps);
    setIndex(0);
  }
  // A tip that left the steps, seen since the tour began, is passed over.
  const at = tour.findIndex(
    (step, place) => place >= index && steps.some(({ id }) => id === step.id),
  );
  const step = at === -1 ? undefined : tour[at];
  const open = step !== undefined;
  const found = useFound(step);
  const shows = useEffectEvent((scene: string | null) => onScene?.(scene));
  const scene = step?.scene;
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
  const next = () => {
    if (step !== undefined) {
      onSeen([step.id]);
      setIndex(at + 1);
    }
  };
  const skip = () => {
    onSeen(tour.slice(at).map(({ id }) => id));
    setIndex(tour.length);
  };
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
  if (!open || found.kind === "seeking") {
    return null;
  }

  const last = at === tour.length - 1;
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
              {t("tips.step", { step: at + 1, count: tour.length })}
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
