import { useCallback, useRef, useState } from "react";

/** What the window holds of something kept on the device, so a page shows it at once. */
export interface HeldCopy<T> {
  /** The copy held; null until the device first answers, and after `forget`. */
  readonly value: T | null;
  /** Asks the device for its copy, unless the one held is still its copy. */
  readonly load: () => void;
  /** Holds what a read brought: the device keeps the same. */
  readonly hold: (value: T) => void;
  /** The device's copy changed another way: the next load asks again, showing this one meanwhile. */
  readonly markStale: () => void;
  /** Drops the copy, for another player's session. */
  readonly forget: () => void;
}

interface Held<T> {
  readonly value: T | null;
  readonly stale: boolean;
}

/** Holds the device's copy that `ask` brings; a page never shows it cleared to ask again. */
export function useHeldCopy<T>(ask: () => Promise<T>): HeldCopy<T> {
  const [value, setValue] = useState<T | null>(null);
  // The same as `value`, with its staleness, for callbacks that must not change with it.
  const held = useRef<Held<T>>({ value: null, stale: false });
  // What the ask on its way was made for: a second load for the same asks nothing.
  const asking = useRef<Held<T> | null>(null);
  const put = useCallback((next: Held<T>) => {
    held.current = next;
    setValue(next.value);
  }, []);
  const hold = useCallback((next: T) => put({ value: next, stale: false }), [put]);
  const load = useCallback(() => {
    const asked = held.current;
    if ((asked.value !== null && !asked.stale) || asking.current === asked) {
      return;
    }
    asking.current = asked;
    void ask().then((kept) => {
      // Anything held since is newer: a read's result, or nothing after a sign-out.
      if (held.current === asked) {
        hold(kept);
      }
      if (asking.current === asked) {
        asking.current = null;
      }
    });
  }, [ask, hold]);
  const markStale = useCallback(() => {
    held.current = { ...held.current, stale: true };
  }, []);
  const forget = useCallback(() => put({ value: null, stale: false }), [put]);
  return { value, load, hold, markStale, forget };
}
