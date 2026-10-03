import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";

import type { PictureWant } from "../session-port";
import { type PictureAnswer, type PictureLane, wantKey } from "./picture-lane";

export interface UsePictureOptions {
  readonly rootMargin: string;
  readonly order: number;
}

export const IN_THE_WINDOW = { rootMargin: "0px" } as const;

/** `want` from `lane`, asked for only while `target` is on screen; undefined until it comes. */
export function usePicture(
  lane: PictureLane,
  want: PictureWant | null,
  target: RefObject<Element | null>,
  { rootMargin, order }: UsePictureOptions,
): PictureAnswer | undefined {
  useSyncExternalStore(lane.subscribe, lane.version);
  // The effect below follows the picture by its key: a new object for the same picture on every
  // render must not take it back and ask again.
  const key = want === null ? null : wantKey(want);
  const wanted = useRef(want);
  wanted.current = want;
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
      { rootMargin },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      takeBack?.();
    };
  }, [lane, key, settled, target, rootMargin, order]);

  return want === null ? undefined : lane.peek(want);
}
