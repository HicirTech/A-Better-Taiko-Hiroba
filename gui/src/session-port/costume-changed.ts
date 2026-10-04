import type { WriteOutcomeView } from "./types";

/** Whether an outcome left Hiroba's costume as written: the portrait is fetched anew, and the
 * history records it. */
export function changedTheCostume<S>(
  outcome: WriteOutcomeView<S>,
): outcome is Extract<WriteOutcomeView<S>, { readonly kind: "applied" | "appliedNotSynced" }> {
  return outcome.kind === "applied" || outcome.kind === "appliedNotSynced";
}
