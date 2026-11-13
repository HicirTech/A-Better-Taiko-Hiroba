import { useState } from "react";

/** A tip as its bubble shows it: where it points, the first found, and its words. */
export interface TipStep {
  readonly id: string;
  /** Selectors tried in order; none: the bubble stands at the window's top, pointing at nothing. */
  readonly at: readonly string[];
  readonly words: string;
  /** What the tip opens to show what it tells, through `onScene`, shut again after it. */
  readonly scene?: string | undefined;
}

/** Where a tour stands: the tips it began with, and how far it has gone through them. */
export interface Tour {
  readonly tips: readonly TipStep[];
  readonly index: number;
}

/** The tip a tour shows, and its place among the tour's tips. */
export interface ShownTip {
  readonly step: TipStep;
  readonly at: number;
}

/** Tips gone past only shorten the steps; one the tour lacks starts it again. */
export const begunAgain = (tour: Tour, steps: readonly TipStep[]): boolean =>
  steps.some(({ id }) => !tour.tips.some((tip) => tip.id === id));

/** The first tip from where the tour stands that the steps still hold: one seen since is passed. */
export function shownOf(tour: Tour, steps: readonly TipStep[]): ShownTip | null {
  const at = tour.tips.findIndex(
    (tip, place) => place >= tour.index && steps.some(({ id }) => id === tip.id),
  );
  const step = at === -1 ? undefined : tour.tips[at];
  return step === undefined ? null : { step, at };
}

/** What Skip marks seen: the tip at `at` and every one after it. */
export const skippedFrom = (tour: Tour, at: number): string[] =>
  tour.tips.slice(at).map(({ id }) => id);

/** The tour through `steps`: the tip shown, and Next and Skip, which tell `onSeen` what is seen. */
export function useTour(steps: readonly TipStep[], onSeen: (ids: readonly string[]) => void) {
  const [tour, setTour] = useState<Tour>({ tips: steps, index: 0 });
  if (begunAgain(tour, steps)) {
    setTour({ tips: steps, index: 0 });
  }
  const shown = shownOf(tour, steps);
  const at = shown?.at ?? -1;
  const next = () => {
    if (shown !== null) {
      onSeen([shown.step.id]);
      setTour((now) => ({ ...now, index: at + 1 }));
    }
  };
  const skip = () => {
    onSeen(skippedFrom(tour, at));
    setTour((now) => ({ ...now, index: now.tips.length }));
  };
  return { shown, count: tour.tips.length, next, skip };
}
