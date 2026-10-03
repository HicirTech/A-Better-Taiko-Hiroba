import { draftCostumeChange, type Result, sameCostume } from "@abth/core";

import type { CostumeEditorView, CostumeSet, ReadFailure, WriteOutcomeView } from "../session-port";
import { type ColourPart, type SlotPart, slotOf } from "./costume-parts";
import { refreshed } from "./write-ending";

export interface HeldEditor {
  readonly editor: CostumeEditorView;
  readonly draft: CostumeSet;
}

export type EditorStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldEditor | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldEditor | null;
    }
  | { readonly name: "editing"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | { readonly name: "confirming"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | { readonly name: "saving"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  // No draft: the undo puts back a set of its own, so an older draft would be over the wrong set.
  | { readonly name: "undoing"; readonly editor: CostumeEditorView }
  | {
      readonly name: "done";
      readonly editor: CostumeEditorView;
      readonly outcome: WriteOutcomeView;
      readonly asUndo: boolean;
    };

export type EditorAction =
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<CostumeEditorView, ReadFailure> }
  | { readonly type: "pickedColour"; readonly part: ColourPart; readonly id: number }
  | { readonly type: "pickedItem"; readonly part: SlotPart; readonly id: number }
  | { readonly type: "reset" }
  | { readonly type: "review" }
  | { readonly type: "back" }
  | { readonly type: "saveStarted" }
  | { readonly type: "undoStarted" }
  | { readonly type: "writeEnded"; readonly outcome: WriteOutcomeView };

export const UNREAD: EditorStep = { name: "unread" };

/** An action the step cannot take returns the very same step, so the page does not draw again. */
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
        ? { ...step, name: "confirming" }
        : step;
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

function withDraft<S extends { readonly draft: CostumeSet }>(step: S, draft: CostumeSet): S {
  return sameCostume(step.draft, draft) ? step : { ...step, draft };
}

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

export function canReadEditorAgain(step: EditorStep): boolean {
  return step.name === "editing" || step.name === "done" || step.name === "loadFailed";
}

export function isWriting(step: EditorStep): boolean {
  return step.name === "saving" || step.name === "undoing";
}
