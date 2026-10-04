import { draftCostumeChange, type Result, sameCostume } from "@abth/core";

import {
  type CostumeEditorView,
  type CostumeSet,
  changedTheCostume,
  type ReadFailure,
  type WriteOutcomeView,
} from "../session-port";
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
  | {
      readonly name: "editing";
      readonly editor: CostumeEditorView;
      readonly draft: CostumeSet;
      /** How the last write ended, until the next pick, reset, save or read; none if it applied. */
      readonly notice: WriteOutcomeView | null;
    }
  | { readonly name: "saving"; readonly editor: CostumeEditorView; readonly draft: CostumeSet };

type EditingStep = Extract<EditorStep, { readonly name: "editing" }>;
export type ShownStep = Extract<EditorStep, { readonly name: "editing" | "saving" }>;

export type EditorAction =
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<CostumeEditorView, ReadFailure> }
  | { readonly type: "pickedColour"; readonly part: ColourPart; readonly id: number }
  | { readonly type: "pickedItem"; readonly part: SlotPart; readonly id: number }
  | { readonly type: "pickedHistory"; readonly set: CostumeSet }
  | { readonly type: "reset" }
  | { readonly type: "saveStarted" }
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
    case "pickedHistory":
      return step.name === "editing" ? withDraft(step, action.set) : step;
    case "reset":
      return step.name === "editing" ? withDraft(step, step.editor.state) : step;
    case "saveStarted":
      return step.name === "editing" && !sameCostume(step.editor.state, step.draft)
        ? { name: "saving", editor: step.editor, draft: step.draft }
        : step;
    case "writeEnded":
      return writeEnded(step, action.outcome);
  }
}

function withDraft(step: EditingStep, draft: CostumeSet): EditingStep {
  return sameCostume(step.draft, draft) && step.notice === null
    ? step
    : { ...step, draft, notice: null };
}

function readStarted(step: EditorStep): EditorStep {
  switch (step.name) {
    case "unread":
      return { name: "loading", held: null };
    case "editing":
      return { name: "loading", held: { editor: step.editor, draft: step.draft } };
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
  return { name: "editing", editor, draft: keepsDraft ? held.draft : editor.state, notice: null };
}

function writeEnded(step: EditorStep, outcome: WriteOutcomeView): EditorStep {
  if (step.name !== "saving") {
    return step;
  }

  const editor = refreshed(step.editor, outcome);
  return {
    name: "editing",
    editor,
    draft: changedTheCostume(outcome) ? editor.state : step.draft,
    notice: outcome.kind === "applied" ? null : outcome,
  };
}

export function previewSetOf(step: EditorStep): CostumeSet | null {
  switch (step.name) {
    case "editing":
    case "saving":
      return step.draft;
    case "loading":
    case "loadFailed":
      return step.held?.draft ?? null;
    case "unread":
      return null;
  }
}

/** Whether the editor is on screen: while editing, and while a save runs over it. */
export function showsEditor(step: EditorStep): step is ShownStep {
  return step.name === "editing" || step.name === "saving";
}

export function canReadEditorAgain(step: EditorStep): boolean {
  return step.name === "editing" || step.name === "loadFailed";
}

export function isWriting(step: EditorStep): boolean {
  return step.name === "saving";
}
