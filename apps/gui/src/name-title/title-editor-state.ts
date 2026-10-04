import { type Result, sameTitle, type TitleOption } from "@abth/core";

import { type Noticed, noticeOf, refreshed } from "../my-page/write-ending";
import type { ReadFailure, TitleEditorView, TitleState, WriteOutcomeView } from "../session-port";

export interface HeldTitles {
  readonly editor: TitleEditorView;
  readonly picked: TitleOption | null;
}

type TitleOutcome = WriteOutcomeView<TitleState>;

export type TitleStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldTitles | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldTitles | null;
    }
  | {
      readonly name: "idle";
      readonly editor: TitleEditorView;
      readonly picked: TitleOption | null;
      /** How the last write ended, until the next pick, save or read; none if it applied. */
      readonly notice: Noticed<TitleState> | null;
    }
  | { readonly name: "saving"; readonly editor: TitleEditorView; readonly picked: TitleOption };

export type TitleAction =
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<TitleEditorView, ReadFailure> }
  | { readonly type: "picked"; readonly option: TitleOption | null }
  | { readonly type: "saveStarted" }
  | { readonly type: "writeEnded"; readonly outcome: TitleOutcome };

export const UNREAD: TitleStep = { name: "unread" };

/** An action the step cannot take returns the very same step, so the page does not draw again. */
export function reduceTitle(step: TitleStep, action: TitleAction): TitleStep {
  switch (action.type) {
    case "forget":
      return UNREAD;
    case "readStarted":
      return readStarted(step);
    case "readEnded":
      return step.name === "loading" ? readEnded(step.held, action.result) : step;
    case "picked":
      return step.name === "idle" && (step.picked !== action.option || step.notice !== null)
        ? { ...step, picked: action.option, notice: null }
        : step;
    case "saveStarted":
      return step.name === "idle" && step.picked !== null && changesTitle(step.editor, step.picked)
        ? { name: "saving", editor: step.editor, picked: step.picked }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

/** Whether writing `picked` would change the title: not when the title worn has that name. */
export function changesTitle(editor: TitleEditorView, picked: TitleOption): boolean {
  return !sameTitle(editor.state, { title: picked.label });
}

function readStarted(step: TitleStep): TitleStep {
  switch (step.name) {
    case "unread":
      return { name: "loading", held: null };
    case "idle":
      return { name: "loading", held: { editor: step.editor, picked: step.picked } };
    case "loadFailed":
      return { name: "loading", held: step.held };
    default:
      return step;
  }
}

function readEnded(
  held: HeldTitles | null,
  result: Result<TitleEditorView, ReadFailure>,
): TitleStep {
  if (!result.ok) {
    return { name: "loadFailed", failure: result.error, held };
  }
  const editor = result.value;
  const picked = held?.picked ?? null;
  const kept =
    picked !== null &&
    editor.options.some((one) => one.id === picked.id && one.label === picked.label);
  return { name: "idle", editor, picked: kept ? picked : null, notice: null };
}

const leavesTheTitle = (outcome: TitleOutcome): boolean =>
  outcome.kind === "applied" || outcome.kind === "appliedNotSynced";

function writeEnded(step: TitleStep, outcome: TitleOutcome): TitleStep {
  if (step.name !== "saving") {
    return step;
  }
  return {
    name: "idle",
    editor: refreshed(step.editor, outcome),
    picked: leavesTheTitle(outcome) ? null : step.picked,
    notice: noticeOf(outcome),
  };
}

export function canReadTitlesAgain(step: TitleStep): boolean {
  return step.name === "idle" || step.name === "loadFailed";
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
