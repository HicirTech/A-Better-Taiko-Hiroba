import { checkNameTarget, isErr, NAME_FORM_MAX_LENGTH } from "@abth/core";

import type { NameState, RenameState, WriteOutcomeView } from "../session-port";

type NameOutcome = WriteOutcomeView<NameState>;

/**
 * The Name section's step. There is nothing to read first: the name is the one my page showed, which
 * the window holds, and the field is the only draft.
 *
 * `typed` is what the player typed, or null while the field is untouched and shows the name worn
 * now, so a name changed elsewhere, or by a write, is the one it shows. Every step keeps it, so a
 * refused name is still in the field after Back.
 *
 * - `idle`: the field; `confirming` and `saving`: the change listed for a last look, and sent.
 * - `undoing`: the undo of the last change is being sent.
 * - `done`: how the last save or undo ended.
 */
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

/** The name worn, and whether Hiroba takes a change, as my page last said: what a review is made from. */
export interface WornName {
  readonly nickname: string;
  readonly rename: RenameState;
}

export type NameAction =
  /** The session is over, or another one begins: nothing of the section is kept. */
  | { readonly type: "forget" }
  | { readonly type: "typed"; readonly value: string }
  | { readonly type: "review"; readonly worn: WornName }
  | { readonly type: "back" }
  | { readonly type: "saveStarted" }
  | { readonly type: "undoStarted" }
  | { readonly type: "writeEnded"; readonly outcome: NameOutcome };

export const IDLE: NameStep = { name: "idle", typed: null };

/**
 * What the draft comes to against the name worn. The hard rules are the core's own
 * (`checkNameTarget`): the form's length, a character that cannot be sent, a closed rename; the
 * name is trimmed first, so white space at its ends is never what refuses it. Hiroba's help page is
 * advice (`describeName`), never a rule here.
 */
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

/** The step an action leads to; an action the step cannot take leaves the very same step. */
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

/** Back from a review keeps the field; back from an outcome keeps it too, unless the name was written. */
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

/** A name the write left written, or an undo that put one back, leaves the field showing the name worn. */
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

/** Whether a save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
export function isWritingName(step: NameStep): boolean {
  return step.name === "saving" || step.name === "undoing";
}

/**
 * The name my page would now show, as a write read it back: what to put in the window's copy of
 * the profile, which asks Hiroba nothing. Null for an ending that says nothing of the name.
 */
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
