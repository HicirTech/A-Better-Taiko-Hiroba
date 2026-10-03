import type { WriteOutcomeView } from "./types";

/** Whether an outcome left Hiroba's costume as written, so the My Don portrait is fetched anew. */
export function changedTheCostume(outcome: { readonly kind: WriteOutcomeView["kind"] }): boolean {
  return outcome.kind === "applied" || outcome.kind === "appliedNotSynced";
}
