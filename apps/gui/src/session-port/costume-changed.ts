import type { WriteOutcomeView } from "./types";

/**
 * Whether a write, or an undo, that ended as `outcome` left Hiroba's costume the one it wrote: the
 * only outcomes after which the My Don portrait is fetched anew, by the platform and the window.
 */
export function changedTheCostume(outcome: WriteOutcomeView): boolean {
  return outcome.kind === "applied" || outcome.kind === "appliedNotSynced";
}
