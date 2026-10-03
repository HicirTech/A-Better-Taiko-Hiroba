import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading } from "@abth/core";

import {
  canReadEditorAgain,
  type EditorAction,
  type EditorStep,
  isWriting,
  previewSetOf,
  reduceEditor,
  UNREAD,
} from "../src/my-page/costume-editor-state";
import type {
  CostumeEditorView,
  CostumeSet,
  ReadFailure,
  WriteOutcomeView,
} from "../src/session-port";

/** A set that is nobody's, with every value different from its neighbours'. */
const BASE: CostumeSet = {
  colorBody: 12,
  colorLimb: 13,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};
const set = (overrides: Partial<CostumeSet> = {}): CostumeSet => ({ ...BASE, ...overrides });

const editorOf = (state: CostumeSet = set()): CostumeEditorView => ({
  state,
  palette: [{ id: 3, hex: "#336699" }],
  slots: [[4, 36], [21, 59], [68], [37], [140]],
});

const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const FAILURE: ReadFailure = { kind: "unreachable" };

const applied = (before: CostumeSet, after: CostumeSet): WriteOutcomeView => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "unchanged",
});

const editing = (state = set(), draft = state): EditorStep => ({
  name: "editing",
  editor: editorOf(state),
  draft,
});
const confirming = (state = set(), draft = state): EditorStep => ({
  name: "confirming",
  editor: editorOf(state),
  draft,
});
const saving = (state = set(), draft = state): EditorStep => ({
  name: "saving",
  editor: editorOf(state),
  draft,
});
const undoing = (state = set()): EditorStep => ({ name: "undoing", editor: editorOf(state) });
const done = (state = set(), outcome = applied(set(), state), asUndo = false): EditorStep => ({
  name: "done",
  editor: editorOf(state),
  outcome,
  asUndo,
});

const run = (step: EditorStep, ...actions: EditorAction[]) => actions.reduce(reduceEditor, step);

function draftOf(step: EditorStep): CostumeSet {
  if (step.name !== "editing" && step.name !== "confirming" && step.name !== "saving") {
    throw new Error(`The ${step.name} step holds no draft`);
  }
  return step.draft;
}

describe("a read of the editor", () => {
  test("begins from nothing held when the editor has not been read", () => {
    expect(run(UNREAD, { type: "readStarted" })).toEqual({ name: "loading", held: null });
  });

  test("opens the editor on the set as read, with nothing yet changed", () => {
    const editor = editorOf(set({ colorFace: 9 }));
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: ok(editor) });

    expect(step).toEqual({ name: "editing", editor, draft: editor.state });
  });

  test("says why it failed, holding nothing the first time", () => {
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: err(FAILURE) });

    expect(step).toEqual({ name: "loadFailed", failure: FAILURE, held: null });
  });

  test("keeps a draft when the set it was made over is the set read again", () => {
    const draft = set({ colorFace: 9, costume5: 0 });
    const fresh = editorOf(set());
    const step = run(
      editing(set(), draft),
      { type: "readStarted" },
      { type: "readEnded", result: ok(fresh) },
    );

    expect(step).toEqual({ name: "editing", editor: fresh, draft });
  });

  test("drops a draft when the set has moved since it was made over it", () => {
    const moved = editorOf(set({ colorBody: 40 }));
    const step = run(
      editing(set(), set({ colorFace: 9 })),
      { type: "readStarted" },
      { type: "readEnded", result: ok(moved) },
    );

    expect(step).toEqual({ name: "editing", editor: moved, draft: moved.state });
  });

  test("holds the draft through a read that fails, for the read after it", () => {
    const draft = set({ colorFace: 9 });
    const failed = run(
      editing(set(), draft),
      { type: "readStarted" },
      { type: "readEnded", result: err(FAILURE) },
    );
    const again = run(
      failed,
      { type: "readStarted" },
      { type: "readEnded", result: ok(editorOf(set())) },
    );

    expect(failed).toMatchObject({ name: "loadFailed", held: { draft } });
    expect(draftOf(again)).toEqual(draft);
  });

  test("takes the set an outcome left as what a read again holds", () => {
    const left = set({ colorFace: 9 });
    const step = run(done(left, applied(set(), left)), { type: "readStarted" });

    expect(step).toMatchObject({ name: "loading", held: { draft: left } });
  });

  type BusyCase = [label: string, step: EditorStep];
  test.each<BusyCase>([
    ["a review", confirming(set(), set({ colorFace: 9 }))],
    ["a save", saving()],
    ["an undo", undoing()],
    ["another read", { name: "loading", held: null }],
  ])("does not begin inside %s", (_label, step) => {
    expect(reduceEditor(step, { type: "readStarted" })).toBe(step);
  });

  test("is not ended by a result when no read is on its way", () => {
    const step = editing();

    expect(
      reduceEditor(step, { type: "readEnded", result: ok(editorOf(set({ colorBody: 1 }))) }),
    ).toBe(step);
  });
});

describe("picking into the draft", () => {
  test("changes one colour and nothing else", () => {
    const step = run(editing(), { type: "pickedColour", part: "colorFace", id: 9 });

    expect(draftOf(step)).toEqual(set({ colorFace: 9 }));
  });

  test("puts a piece in its own slot and takes the きぐるみ off", () => {
    const step = run(
      editing(set({ costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 })),
      { type: "pickedItem", part: "costume3", id: 70 },
    );

    expect(draftOf(step)).toMatchObject({ costume1: 0, costume3: 70 });
  });

  test("empties the four pieces for a きぐるみ, by the site's own rule", () => {
    const step = run(editing(), { type: "pickedItem", part: "costume1", id: 36 });

    expect(draftOf(step)).toEqual(
      set({ costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }),
    );
  });

  test("empties only the slot for はずす", () => {
    const step = run(editing(), { type: "pickedItem", part: "costume3", id: 0 });

    expect(draftOf(step)).toEqual(set({ costume3: 0 }));
  });

  test("is the same step when the pick is what the draft holds already", () => {
    const step = editing();

    expect(
      reduceEditor(step, { type: "pickedColour", part: "colorBody", id: BASE.colorBody }),
    ).toBe(step);
    expect(reduceEditor(step, { type: "pickedItem", part: "costume2", id: BASE.costume2 })).toBe(
      step,
    );
  });

  test("leaves the set as read alone", () => {
    const step = run(editing(), { type: "pickedColour", part: "colorFace", id: 9 });

    expect(step).toMatchObject({ editor: { state: set() } });
  });

  type NotEditing = [label: string, step: EditorStep];
  test.each<NotEditing>([
    ["a review", confirming(set(), set({ colorFace: 9 }))],
    ["a save", saving()],
    ["an outcome", done()],
    ["nothing read", UNREAD],
  ])("picks nothing in %s", (_label, step) => {
    expect(reduceEditor(step, { type: "pickedColour", part: "colorFace", id: 9 })).toBe(step);
    expect(reduceEditor(step, { type: "pickedItem", part: "costume1", id: 36 })).toBe(step);
  });
});

describe("Reset", () => {
  test("puts back the set as read", () => {
    const changed = editing(set(), set({ colorFace: 9, costume2: 0 }));

    expect(run(changed, { type: "reset" })).toEqual(editing());
  });

  test("is the same step when nothing has changed", () => {
    const step = editing();

    expect(reduceEditor(step, { type: "reset" })).toBe(step);
  });

  test("resets nothing in a review", () => {
    const step = confirming(set(), set({ colorFace: 9 }));

    expect(reduceEditor(step, { type: "reset" })).toBe(step);
  });
});

describe("the review and the save", () => {
  const drafted = set({ colorFace: 9 });

  test("lists nothing to review when nothing has changed", () => {
    const step = editing();

    expect(reduceEditor(step, { type: "review" })).toBe(step);
  });

  test("goes back from the review with the draft kept", () => {
    const step = run(editing(set(), drafted), { type: "review" }, { type: "back" });

    expect(step).toEqual(editing(set(), drafted));
  });

  test("sends the draft that was reviewed, from the review alone", () => {
    const reviewed = run(editing(set(), drafted), { type: "review" });

    expect(run(reviewed, { type: "saveStarted" })).toEqual(saving(set(), drafted));
    expect(reduceEditor(editing(set(), drafted), { type: "saveStarted" })).toEqual(
      editing(set(), drafted),
    );
  });

  test("ends over the set the save read back", () => {
    const after = set({ colorFace: 9 });
    const outcome = applied(set(), after);
    const step = run(saving(set(), after), { type: "writeEnded", outcome });

    expect(step).toEqual({ name: "done", editor: editorOf(after), outcome, asUndo: false });
  });

  test("goes back from an outcome to editing on the set the write left, with no draft", () => {
    const left = set({ colorFace: 9 });
    const step = run(done(left), { type: "back" });

    expect(step).toEqual(editing(left));
  });
});

describe("the set a write leaves in the editor", () => {
  const before = set();
  const planned = set({ colorFace: 9 });
  const elsewhere = set({ colorBody: 40 });

  type LeftCase = [label: string, outcome: WriteOutcomeView, left: CostumeSet];
  test.each<LeftCase>([
    ["applied", applied(before, planned), planned],
    [
      "appliedNotSynced",
      { kind: "appliedNotSynced", before, after: planned, save: SAVE, cross: "unchanged" },
      planned,
    ],
    [
      "notApplied",
      {
        kind: "notApplied",
        before,
        after: before,
        reason: { kind: "unchanged" },
        save: SAVE,
        cross: "unchanged",
      },
      before,
    ],
    [
      "diverged",
      {
        kind: "diverged",
        before,
        expectedAfter: planned,
        after: elsewhere,
        save: SAVE,
        cross: "unchanged",
      },
      elsewhere,
    ],
    ["changedSincePreview", { kind: "changedSincePreview", current: elsewhere }, elsewhere],
  ])("is the set the write read back for %s", (_label, outcome, left) => {
    const step = run(saving(before, planned), { type: "writeEnded", outcome });

    expect(step).toMatchObject({ name: "done", editor: { state: left } });
  });

  type KeptCase = [label: string, outcome: WriteOutcomeView];
  test.each<KeptCase>([
    ["maintenance", { kind: "maintenance" }],
    ["invalidTarget", { kind: "invalidTarget", field: "costume1" }],
    ["interrupted", { kind: "interrupted" }],
    ["busy", { kind: "busy" }],
  ])("is the set as it was read for %s, which read nothing back", (_label, outcome) => {
    const step = run(saving(before, planned), { type: "writeEnded", outcome });

    expect(step).toMatchObject({ name: "done", editor: { state: before } });
  });

  test("ends nothing when no write is on its way", () => {
    const step = editing();

    expect(reduceEditor(step, { type: "writeEnded", outcome: applied(before, planned) })).toBe(
      step,
    );
  });
});

describe("the undo", () => {
  const reverted = set({ colorFace: 9 });

  type NoUndo = [label: string, step: EditorStep];
  test.each<NoUndo>([
    ["editing", editing(set(), set({ colorBody: 40 }))],
    ["an outcome", done()],
  ])("begins from %s and drops the draft, which the undo's set replaces", (_label, step) => {
    expect(reduceEditor(step, { type: "undoStarted" })).toEqual(undoing(set()));
  });

  test.each<NoUndo>([
    ["a review", confirming(set(), reverted)],
    ["a save", saving()],
    ["another undo", undoing()],
    ["a read", { name: "loading", held: null }],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held: null }],
    ["nothing read", UNREAD],
  ])("does not begin from %s", (_label, step) => {
    expect(reduceEditor(step, { type: "undoStarted" })).toBe(step);
  });

  test("ends as an undo's outcome over the set it read back", () => {
    const outcome = applied(reverted, set());
    const step = run(undoing(reverted), { type: "writeEnded", outcome });

    expect(step).toEqual({ name: "done", editor: editorOf(set()), outcome, asUndo: true });
  });
});

describe("forgetting the editor", () => {
  test.each<[label: string, step: EditorStep]>([
    ["a draft", editing(set(), set({ colorFace: 9 }))],
    ["a review", confirming(set(), set({ colorFace: 9 }))],
    ["an outcome", done()],
    ["a read on its way", { name: "loading", held: { editor: editorOf(), draft: set() } }],
  ])("drops %s", (_label, step) => {
    expect(reduceEditor(step, { type: "forget" })).toBe(UNREAD);
  });
});

describe("what the page asks of a step", () => {
  const drafted = set({ colorFace: 9 });
  const held = { editor: editorOf(), draft: drafted };

  type PreviewCase = [label: string, step: EditorStep, previewed: CostumeSet | null];
  test.each<PreviewCase>([
    ["nothing read", UNREAD, null],
    ["a first read", { name: "loading", held: null }, null],
    ["a read again", { name: "loading", held }, drafted],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held }, drafted],
    ["a draft", editing(set(), drafted), drafted],
    ["a review", confirming(set(), drafted), drafted],
    ["a save", saving(set(), drafted), drafted],
    ["an undo", undoing(set({ colorBody: 40 })), set({ colorBody: 40 })],
    ["an outcome", done(set({ colorBody: 40 })), set({ colorBody: 40 })],
  ])("draws the picture of the right set for %s", (_label, step, previewed) => {
    expect(previewSetOf(step)).toEqual(previewed);
  });

  type ReadCase = [label: string, step: EditorStep, mayRead: boolean];
  test.each<ReadCase>([
    ["a draft", editing(), true],
    ["an outcome", done(), true],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held: null }, true],
    ["a review", confirming(set(), drafted), false],
    ["a save", saving(), false],
    ["an undo", undoing(), false],
    ["a read on its way", { name: "loading", held: null }, false],
  ])("lets the editor be read again from %s: %p", (_label, step, mayRead) => {
    expect(canReadEditorAgain(step)).toBe(mayRead);
  });

  test("calls a save and an undo writing, and nothing else", () => {
    const steps = [UNREAD, editing(), confirming(), saving(), undoing(), done()];

    expect(steps.filter(isWriting).map((step) => step.name)).toEqual(["saving", "undoing"]);
  });
});
