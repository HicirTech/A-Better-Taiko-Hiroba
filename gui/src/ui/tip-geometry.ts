import { useEffect, useLayoutEffect, useState } from "react";

import type { TipStep } from "./tip-tour-state";

/** How long a tip waits for what it points at to be drawn; then it stands at the top. */
const FIND_WITHIN_MS = 2000;
const FIND_EVERY_MS = 200;
/** What a tip opens moves first, a drawer sliding or a card unfolding: then it is pointed at. */
const SCENE_OPENS_MS = 300;

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
export function useFound(step: TipStep | undefined): Found {
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
export function useBox(element: Element | null): DOMRect | null {
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

/** Whether a target as tall as the window pushed the bubble over `box`, so no arrow points. */
export function useOverTarget(
  bubble: { readonly current: HTMLElement | null },
  box: DOMRect | null,
) {
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
