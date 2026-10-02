import { type Result, sameTitle, type TitleOption } from "@abth/core";

import { refreshed } from "../my-page/write-ending";
import type { ReadFailure, TitleEditorView, TitleState, WriteOutcomeView } from "../session-port";

/** What a title page read, and the title picked over it: what a read again may keep. */
export interface HeldTitles {
  readonly editor: TitleEditorView;
  readonly picked: TitleOption | null;
}

type TitleOutcome = WriteOutcomeView<TitleState>;

/**
 * Where the Title section stands. The window holds it above the page, so a pick, a review or an
 * outcome is still there after a visit to another page or a read of my page.
 *
 * - `unread`: the list has not been read since the session began.
 * - `loading`: a read is on its way; `held` is what the section had, for a read again to keep.
 * - `idle`: the list read, and the title picked from it, if one is; `confirming` and `saving`: the
 *   pick listed for a last look, and sent.
 * - `undoing`: the undo of the last change is being sent. It holds no pick: it puts back a title of
 *   its own.
 * - `done`: how the last save or undo ended, over the title as it read back.
 */
export type TitleStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldTitles | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldTitles | null;
    }
  | { readonly name: "idle"; readonly editor: TitleEditorView; readonly picked: TitleOption | null }
  | { readonly name: "confirming"; readonly editor: TitleEditorView; readonly picked: TitleOption }
  | { readonly name: "saving"; readonly editor: TitleEditorView; readonly picked: TitleOption }
  | { readonly name: "undoing"; readonly editor: TitleEditorView }
  | {
      readonly name: "done";
      readonly editor: TitleEditorView;
      readonly outcome: TitleOutcome;
      readonly asUndo: boolean;
    };

export type TitleAction =
  /** The session is over, or another one begins: nothing of the section is kept. */
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<TitleEditorView, ReadFailure> }
  | { readonly type: "picked"; readonly option: TitleOption | null }
  | { readonly type: "review" }
  | { readonly type: "back" }
  | { readonly type: "saveStarted" }
  | { readonly type: "undoStarted" }
  | { readonly type: "writeEnded"; readonly outcome: TitleOutcome };

export const UNREAD: TitleStep = { name: "unread" };

/** The step an action leads to; an action the step cannot take leaves the very same step. */
export function reduceTitle(step: TitleStep, action: TitleAction): TitleStep {
  switch (action.type) {
    case "forget":
      return UNREAD;
    case "readStarted":
      return readStarted(step);
    case "readEnded":
      return step.name === "loading" ? readEnded(step.held, action.result) : step;
    case "picked":
      return step.name === "idle" && step.picked !== action.option
        ? { ...step, picked: action.option }
        : step;
    case "review":
      return step.name === "idle" && step.picked !== null && changesTitle(step.editor, step.picked)
        ? { name: "confirming", editor: step.editor, picked: step.picked }
        : step;
    case "back":
      return back(step);
    case "saveStarted":
      return step.name === "confirming"
        ? { name: "saving", editor: step.editor, picked: step.picked }
        : step;
    case "undoStarted":
      return step.name === "idle" || step.name === "done"
        ? { name: "undoing", editor: step.editor }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

/** Whether writing `picked` would change the title: not when it is a name the title worn has. */
export function changesTitle(editor: TitleEditorView, picked: TitleOption): boolean {
  return !sameTitle(editor.state, { title: picked.label });
}

/** A read begins from where a read may: not inside a review, a save or an undo. */
function readStarted(step: TitleStep): TitleStep {
  switch (step.name) {
    case "unread":
      return { name: "loading", held: null };
    case "idle":
      return { name: "loading", held: { editor: step.editor, picked: step.picked } };
    case "done":
      return { name: "loading", held: { editor: step.editor, picked: null } };
    case "loadFailed":
      return { name: "loading", held: step.held };
    default:
      return step;
  }
}

/**
 * A read that came opens the list. A pick held from before is kept only if that title is still
 * in the list, under the name the pick had.
 */
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
  return { name: "idle", editor, picked: kept ? picked : null };
}

/** Back from a review keeps the pick; back from an outcome takes the title the write left, picking nothing. */
function back(step: TitleStep): TitleStep {
  switch (step.name) {
    case "confirming":
      return { name: "idle", editor: step.editor, picked: step.picked };
    case "done":
      return { name: "idle", editor: step.editor, picked: null };
    default:
      return step;
  }
}

function writeEnded(step: TitleStep, outcome: TitleOutcome): TitleStep {
  switch (step.name) {
    case "saving":
      return { name: "done", editor: refreshed(step.editor, outcome), outcome, asUndo: false };
    case "undoing":
      return { name: "done", editor: refreshed(step.editor, outcome), outcome, asUndo: true };
    default:
      return step;
  }
}

/** Whether the list may be read again from here: not inside a review, a save or an undo. */
export function canReadTitlesAgain(step: TitleStep): boolean {
  return step.name === "idle" || step.name === "done" || step.name === "loadFailed";
}

/** Whether a save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
export function isWritingTitle(step: TitleStep): boolean {
  return step.name === "saving" || step.name === "undoing";
}

/**
 * Whether the window's copy of my page is out of date after this ending: the title moved, or may
 * have, so the plate is read again. A write that changed nothing, or stopped before sending, leaves
 * it as it is.
 */
export function movedTheTitle(outcome: { readonly kind: TitleOutcome["kind"] }): boolean {
  return (
    outcome.kind === "applied" ||
    outcome.kind === "appliedNotSynced" ||
    outcome.kind === "diverged" ||
    outcome.kind === "changedSincePreview"
  );
}
