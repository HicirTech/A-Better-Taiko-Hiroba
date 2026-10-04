import { checkNameTarget, isErr, NAME_FORM_MAX_LENGTH } from "@abth/core";

import { type Noticed, noticeOf } from "../my-page/write-ending";
import type { NameState, RenameState, WriteOutcomeView } from "../session-port";

type NameOutcome = WriteOutcomeView<NameState>;

// `typed` is null while the field is untouched and shows the name worn now.
export type NameStep =
  | {
      readonly name: "idle";
      readonly typed: string | null;
      /** How the last write ended, until the next typing or save; none if it applied. */
      readonly notice: Noticed<NameState> | null;
    }
  | { readonly name: "saving"; readonly typed: string | null };

export interface WornName {
  readonly nickname: string;
  readonly rename: RenameState;
}

export type NameAction =
  | { readonly type: "forget" }
  | { readonly type: "typed"; readonly value: string }
  | { readonly type: "saveStarted" }
  | { readonly type: "writeEnded"; readonly outcome: NameOutcome };

export const IDLE: NameStep = { name: "idle", typed: null, notice: null };

// Only the core's checkNameTarget refuses a name; Hiroba's help page is no rule here.
export type NameVerdict =
  | { readonly kind: "ok"; readonly target: NameState }
  | { readonly kind: "same" }
  | { readonly kind: "empty" }
  | { readonly kind: "refused"; readonly field: string };

export function judgeName(typed: string | null, worn: WornName): NameVerdict {
  const name = (typed ?? worn.nickname).trim();
  if (name === "") {
    return { kind: "empty" };
  }
  const checked = checkNameTarget(
    {
      state: { nickname: worn.nickname },
      maxLength: NAME_FORM_MAX_LENGTH,
      rename: worn.rename,
    },
    { nickname: name },
  );
  if (isErr(checked)) {
    return { kind: "refused", field: checked.error.field };
  }
  return name === worn.nickname ? { kind: "same" } : { kind: "ok", target: { nickname: name } };
}

/** An action the step cannot take returns the very same step, so the page does not draw again. */
export function reduceName(step: NameStep, action: NameAction): NameStep {
  switch (action.type) {
    case "forget":
      return IDLE;
    case "typed":
      return step.name === "idle" && (step.typed !== action.value || step.notice !== null)
        ? { name: "idle", typed: action.value, notice: null }
        : step;
    case "saveStarted":
      return step.name === "idle" ? { name: "saving", typed: step.typed } : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

const leavesTheName = (outcome: NameOutcome): boolean =>
  outcome.kind === "applied" || outcome.kind === "appliedNotSynced";

function writeEnded(step: NameStep, outcome: NameOutcome): NameStep {
  if (step.name !== "saving") {
    return step;
  }
  return {
    name: "idle",
    typed: leavesTheName(outcome) ? null : step.typed,
    notice: noticeOf(outcome),
  };
}

export function isWritingName(step: NameStep): boolean {
  return step.name === "saving";
}

/** The name my page would now show, as a write read it back; null when the ending says nothing. */
export function nameAfter(outcome: NameOutcome): string | null {
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
    case "notApplied":
    case "diverged":
      return outcome.after.nickname;
    case "changedSincePreview":
      return outcome.current.nickname;
    default:
      return null;
  }
}
