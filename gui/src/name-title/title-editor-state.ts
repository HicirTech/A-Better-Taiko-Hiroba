import { type Result, sameTitle, type TitleOption } from "@abth/core";

import { type Noticed, noticeOf } from "../my-page/write-ending";
import type { ReadFailure, TitleEditorView, TitleState, WriteOutcomeView } from "../session-port";

type TitleOutcome = WriteOutcomeView<TitleState>;

/** The titles to choose from: read when the picker opens, forgotten by a write or a new read. */
export type TitleList =
  | { readonly name: "unread" }
  | { readonly name: "loading" }
  | { readonly name: "failed"; readonly failure: ReadFailure }
  | { readonly name: "read"; readonly options: readonly TitleOption[] };

export type TitleStep =
  | {
      readonly name: "idle";
      readonly list: TitleList;
      readonly picked: TitleOption | null;
      /** How the last write ended, until the next pick, save or read; none if it applied. */
      readonly notice: Noticed<TitleState> | null;
    }
  | { readonly name: "saving"; readonly list: TitleList; readonly picked: TitleOption };

type Idle = Extract<TitleStep, { readonly name: "idle" }>;

export type TitleAction =
  | { readonly type: "forget" }
  | { readonly type: "listForgotten" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<TitleEditorView, ReadFailure> }
  | { readonly type: "picked"; readonly option: TitleOption | null }
  | { readonly type: "saveStarted" }
  | { readonly type: "writeEnded"; readonly outcome: TitleOutcome };

const UNREAD: TitleList = { name: "unread" };

export const IDLE: TitleStep = { name: "idle", list: UNREAD, picked: null, notice: null };

/** An action the step cannot take returns the very same step, so the page does not draw again. */
export function reduceTitle(step: TitleStep, action: TitleAction): TitleStep {
  switch (action.type) {
    case "forget":
      return IDLE;
    case "listForgotten":
      return step.name === "idle" && (step.list.name !== "unread" || step.notice !== null)
        ? { ...step, list: UNREAD, notice: null }
        : step;
    case "readStarted":
      return mayReadTitles(step) ? { ...step, list: { name: "loading" } } : step;
    case "readEnded":
      return step.name === "idle" && step.list.name === "loading"
        ? readEnded(step, action.result)
        : step;
    case "picked":
      return step.name === "idle" && (step.picked !== action.option || step.notice !== null)
        ? { ...step, picked: action.option, notice: null }
        : step;
    case "saveStarted":
      return step.name === "idle" && step.picked !== null
        ? { name: "saving", list: step.list, picked: step.picked }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

/** Whether writing `picked` would change the title: not when the title worn has that name. */
export function changesTitle(worn: string, picked: TitleOption): boolean {
  return !sameTitle({ title: worn }, { title: picked.label });
}

export function canSaveTitle(step: TitleStep, worn: string): boolean {
  return step.name === "idle" && step.picked !== null && changesTitle(worn, step.picked);
}

/** Whether the list is neither read nor being read, so opening the picker reads it. */
export function mayReadTitles(step: TitleStep): step is Idle {
  return step.name === "idle" && (step.list.name === "unread" || step.list.name === "failed");
}

function readEnded(step: Idle, result: Result<TitleEditorView, ReadFailure>): TitleStep {
  if (!result.ok) {
    return { ...step, list: { name: "failed", failure: result.error } };
  }
  const { options } = result.value;
  const { picked } = step;
  const kept =
    picked !== null && options.some((one) => one.id === picked.id && one.label === picked.label);
  return { ...step, list: { name: "read", options }, picked: kept ? picked : null };
}

const leavesTheTitle = (outcome: TitleOutcome): boolean =>
  outcome.kind === "applied" || outcome.kind === "appliedNotSynced";

function writeEnded(step: TitleStep, outcome: TitleOutcome): TitleStep {
  if (step.name !== "saving") {
    return step;
  }
  return {
    name: "idle",
    list: UNREAD,
    picked: leavesTheTitle(outcome) ? null : step.picked,
    notice: noticeOf(outcome),
  };
}

export function isWritingTitle(step: TitleStep): boolean {
  return step.name === "saving";
}

/** Whether the title moved, or may have, so the window's copy of my page is out of date. */
export function movedTheTitle(outcome: { readonly kind: TitleOutcome["kind"] }): boolean {
  return (
    outcome.kind === "applied" ||
    outcome.kind === "appliedNotSynced" ||
    outcome.kind === "diverged" ||
    outcome.kind === "changedSincePreview"
  );
}
