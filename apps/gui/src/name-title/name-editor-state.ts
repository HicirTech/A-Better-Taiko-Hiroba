import { checkNameTarget, isErr, NAME_FORM_MAX_LENGTH } from "@abth/core";

import type { NameState, RenameState, WriteOutcomeView } from "../session-port";

type NameOutcome = WriteOutcomeView<NameState>;

// `typed` is null while the field is untouched and shows the name worn now; every step keeps it,
// so a refused name is still in the field after Back.
export type NameStep =
  | { readonly name: "idle"; readonly typed: string | null }
  | {
      readonly name: "confirming";
      readonly typed: string | null;
      readonly expected: NameState;
      readonly target: NameState;
    }
  | {
      readonly name: "saving";
      readonly typed: string | null;
      readonly expected: NameState;
      readonly target: NameState;
    }
  | { readonly name: "undoing"; readonly typed: string | null }
  | {
      readonly name: "done";
      readonly typed: string | null;
      readonly outcome: NameOutcome;
      readonly asUndo: boolean;
    };

export interface WornName {
  readonly nickname: string;
  readonly rename: RenameState;
}

export type NameAction =
  | { readonly type: "forget" }
  | { readonly type: "typed"; readonly value: string }
  | { readonly type: "review"; readonly worn: WornName }
  | { readonly type: "back" }
  | { readonly type: "saveStarted" }
  | { readonly type: "undoStarted" }
  | { readonly type: "writeEnded"; readonly outcome: NameOutcome };

export const IDLE: NameStep = { name: "idle", typed: null };

// Only the core's checkNameTarget refuses a name; Hiroba's help page is advice, never a rule here.
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
      return step.name === "idle" && step.typed !== action.value
        ? { name: "idle", typed: action.value }
        : step;
    case "review": {
      const verdict = judgeName(step.typed, action.worn);
      return step.name === "idle" && verdict.kind === "ok"
        ? {
            name: "confirming",
            typed: step.typed,
            expected: { nickname: action.worn.nickname },
            target: verdict.target,
          }
        : step;
    }
    case "back":
      return back(step);
    case "saveStarted":
      return step.name === "confirming"
        ? { name: "saving", typed: step.typed, expected: step.expected, target: step.target }
        : step;
    case "undoStarted":
      return step.name === "idle" || step.name === "done"
        ? { name: "undoing", typed: step.typed }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

function back(step: NameStep): NameStep {
  switch (step.name) {
    case "confirming":
      return { name: "idle", typed: step.typed };
    case "done":
      return { name: "idle", typed: step.typed };
    default:
      return step;
  }
}

const leavesTheName = (outcome: NameOutcome): boolean =>
  outcome.kind === "applied" || outcome.kind === "appliedNotSynced";

function writeEnded(step: NameStep, outcome: NameOutcome): NameStep {
  if (step.name !== "saving" && step.name !== "undoing") {
    return step;
  }
  return {
    name: "done",
    typed: leavesTheName(outcome) ? null : step.typed,
    outcome,
    asUndo: step.name === "undoing",
  };
}

export function isWritingName(step: NameStep): boolean {
  return step.name === "saving" || step.name === "undoing";
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
