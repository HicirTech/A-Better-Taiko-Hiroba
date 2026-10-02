import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";

import type { PictureWant } from "../session-port";
import { type PictureAnswer, type PictureLane, wantKey } from "./picture-lane";

export interface UsePictureOptions {
  /** The box that scrolls the picture into and out of view; null for the window itself. */
  readonly root: RefObject<Element | null> | null;
  /** How far outside the box a picture counts as seen already: a CSS margin, such as a row. */
  readonly rootMargin: string;
  /** Where the picture sits, top to bottom: the lane asks for the lower first. */
  readonly order: number;
}

/** A picture seen when it is in the window itself, with no margin: the pages' usual case. */
export const IN_THE_WINDOW = { root: null, rootMargin: "0px" } as const;

/**
 * The picture `want` names, from `lane`, for the element `target` points at: asked for only while
 * that element is on screen (or within `rootMargin` of it), and taken back when it leaves before
 * its turn. Undefined until the lane has it, or when `want` is null. A picture that comes after the
 * element is gone is kept by the lane for the next time, and not shown. One whose kind the lane
 * renewed is asked for again, and the picture it had is given until the new one comes.
 */
export function usePicture(
  lane: PictureLane,
  want: PictureWant | null,
  target: RefObject<Element | null>,
  { root, rootMargin, order }: UsePictureOptions,
): PictureAnswer | undefined {
  useSyncExternalStore(lane.subscribe, lane.version);
  // The effect below follows the picture by its key: a new object for the same picture on every
  // render must not take it back and ask again.
  const key = want === null ? null : wantKey(want);
  const wanted = useRef(want);
  wanted.current = want;
  // Whether the lane's answer stands: once it is renewed, the picture is asked for again, while the
  // answer the lane had is still shown.
  const settled = want !== null && lane.settled(want);

  useEffect(() => {
    const picture = wanted.current;
    const element = target.current;
    if (key === null || picture === null || element === null || settled) {
      return;
    }
    let takeBack: (() => void) | null = null;
    if (typeof IntersectionObserver === "undefined") {
      takeBack = lane.ask(picture, { order });
      return takeBack;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((entry) => entry.isIntersecting);
        if (seen && takeBack === null) {
          takeBack = lane.ask(picture, { order });
        } else if (!seen && takeBack !== null) {
          takeBack();
          takeBack = null;
        }
      },
      { root: root?.current ?? null, rootMargin },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      takeBack?.();
    };
  }, [lane, key, settled, target, root, rootMargin, order]);

  return want === null ? undefined : lane.peek(want);
}
