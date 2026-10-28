import type { WriteOutcomeView } from "./types";

/** Whether an outcome left Hiroba as written: its history records it, and a costume's portrait is
 * fetched anew. */
export function changedOnHiroba<S>(
  outcome: WriteOutcomeView<S>,
): outcome is Extract<WriteOutcomeView<S>, { readonly kind: "applied" | "appliedNotSynced" }> {
  return outcome.kind === "applied" || outcome.kind === "appliedNotSynced";
}
