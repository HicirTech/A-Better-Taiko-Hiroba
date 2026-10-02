import { draftCostumeChange, type Result, sameCostume } from "@abth/core";

import type { CostumeEditorView, CostumeSet, ReadFailure, WriteOutcomeView } from "../session-port";
import { type ColourPart, type SlotPart, slotOf } from "./costume-parts";

/** An editor the page read, and the draft made over it: what a read again may keep. */
export interface HeldEditor {
  readonly editor: CostumeEditorView;
  readonly draft: CostumeSet;
}

/**
 * Where the Costume page's editor stands. The page holds it above itself, so a draft, a review or
 * an outcome is still there after a visit to another page.
 *
 * - `unread`: the editor has not been read since the session began.
 * - `loading`: a read is on its way; `held` is what the page had, for a read again to keep.
 * - `editing`, `confirming`, `saving`: a draft made over the set as read, being picked, listed
 *   for a last look, and sent.
 * - `undoing`: the undo of the last change is being sent. It holds no draft: the undo puts back a
 *   set of its own, and a draft made over the one before it would no longer be over what is saved.
 * - `done`: how the last save or undo ended, over the set it read back.
 */
export type EditorStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldEditor | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldEditor | null;
    }
  | { readonly name: "editing"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | {
      readonly name: "confirming";
      readonly editor: CostumeEditorView;
      readonly draft: CostumeSet;
      readonly acknowledged: boolean;
    }
  | { readonly name: "saving"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | { readonly name: "undoing"; readonly editor: CostumeEditorView }
  | {
      readonly name: "done";
      readonly editor: CostumeEditorView;
      readonly outcome: WriteOutcomeView;
      readonly asUndo: boolean;
    };

export type EditorAction =
  /** The session is over, or another one begins: nothing of the editor is kept. */
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<CostumeEditorView, ReadFailure> }
  | { readonly type: "pickedColour"; readonly part: ColourPart; readonly id: number }
  | { readonly type: "pickedItem"; readonly part: SlotPart; readonly id: number }
  | { readonly type: "reset" }
  | { readonly type: "review" }
  | { readonly type: "acknowledged"; readonly checked: boolean }
  | { readonly type: "back" }
  | { readonly type: "saveStarted" }
  | { readonly type: "undoStarted" }
  | { readonly type: "writeEnded"; readonly outcome: WriteOutcomeView };

export const UNREAD: EditorStep = { name: "unread" };

/**
 * The step an action leads to. An action the step cannot take leaves the very same step, so the
 * page does not draw again for it.
 */
export function reduceEditor(step: EditorStep, action: EditorAction): EditorStep {
  switch (action.type) {
    case "forget":
      return UNREAD;
    case "readStarted":
      return readStarted(step);
    case "readEnded":
      return step.name === "loading" ? readEnded(step.held, action.result) : step;
    case "pickedColour":
      return step.name === "editing"
        ? withDraft(step, { ...step.draft, [action.part]: action.id })
        : step;
    case "pickedItem":
      return step.name === "editing"
        ? withDraft(step, draftCostumeChange(step.draft, slotOf(action.part), action.id))
        : step;
    case "reset":
      return step.name === "editing" ? withDraft(step, step.editor.state) : step;
    case "review":
      return step.name === "editing" && !sameCostume(step.editor.state, step.draft)
        ? { ...step, name: "confirming", acknowledged: false }
        : step;
    case "acknowledged":
      return step.name === "confirming" ? { ...step, acknowledged: action.checked } : step;
    case "back":
      return back(step);
    case "saveStarted":
      return step.name === "confirming"
        ? { name: "saving", editor: step.editor, draft: step.draft }
        : step;
    case "undoStarted":
      return step.name === "editing" || step.name === "done"
        ? { name: "undoing", editor: step.editor }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

/** The draft changed to `draft`, or the step itself when it is the draft it holds already. */
function withDraft<S extends { readonly draft: CostumeSet }>(step: S, draft: CostumeSet): S {
  return sameCostume(step.draft, draft) ? step : { ...step, draft };
}

/**
 * A read begins from where a read may: not inside a review, a save or an undo, and not while one
 * is already on its way.
 */
function readStarted(step: EditorStep): EditorStep {
  switch (step.name) {
    case "unread":
      return { name: "loading", held: null };
    case "editing":
      return { name: "loading", held: { editor: step.editor, draft: step.draft } };
    case "done":
      return { name: "loading", held: { editor: step.editor, draft: step.editor.state } };
    case "loadFailed":
      return { name: "loading", held: step.held };
    default:
      return step;
  }
}

/**
 * A read that came opens the editor on the set as read. A draft held from before is kept only if
 * the set it was made over is the set read now; one made over a set that has moved is dropped.
 */
function readEnded(
  held: HeldEditor | null,
  result: Result<CostumeEditorView, ReadFailure>,
): EditorStep {
  if (!result.ok) {
    return { name: "loadFailed", failure: result.error, held };
  }

  const editor = result.value;
  const keepsDraft = held !== null && sameCostume(held.editor.state, editor.state);
  return { name: "editing", editor, draft: keepsDraft ? held.draft : editor.state };
}

/** Back from a review keeps the draft; back from an outcome takes the set the write left. */
function back(step: EditorStep): EditorStep {
  switch (step.name) {
    case "confirming":
      return { name: "editing", editor: step.editor, draft: step.draft };
    case "done":
      return { name: "editing", editor: step.editor, draft: step.editor.state };
    default:
      return step;
  }
}

function writeEnded(step: EditorStep, outcome: WriteOutcomeView): EditorStep {
  switch (step.name) {
    case "saving":
      return { name: "done", editor: refreshed(step.editor, outcome), outcome, asUndo: false };
    case "undoing":
      return { name: "done", editor: refreshed(step.editor, outcome), outcome, asUndo: true };
    default:
      return step;
  }
}

/** The editor after a write, with the set as the write last saw it. */
export function refreshed(editor: CostumeEditorView, outcome: WriteOutcomeView): CostumeEditorView {
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
    case "notApplied":
    case "diverged":
      return { ...editor, state: outcome.after };
    case "changedSincePreview":
      return { ...editor, state: outcome.current };
    default:
      return editor;
  }
}

/**
 * The set whose picture the page draws now: the draft while there is one, and after a write the
 * set as it read back, which is the draft's own picture when the write applied. A read again keeps
 * the picture of what it held. Null while there is nothing to draw.
 */
export function previewSetOf(step: EditorStep): CostumeSet | null {
  switch (step.name) {
    case "editing":
    case "confirming":
    case "saving":
      return step.draft;
    case "undoing":
    case "done":
      return step.editor.state;
    case "loading":
    case "loadFailed":
      return step.held?.draft ?? null;
    case "unread":
      return null;
  }
}

/** Whether the editor may be read again from here: not inside a review, a save or an undo. */
export function canReadEditorAgain(step: EditorStep): boolean {
  return step.name === "editing" || step.name === "done" || step.name === "loadFailed";
}

/** Whether a save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
export function isWriting(step: EditorStep): boolean {
  return step.name === "saving" || step.name === "undoing";
}
