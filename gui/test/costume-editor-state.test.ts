import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading } from "@abth/core";

import {
  canReadEditorAgain,
  type EditorAction,
  type EditorStep,
  isWriting,
  previewSetOf,
  reduceEditor,
  shownEditorOf,
  showsEditor,
  UNREAD,
} from "../src/my-page/costume-editor-state";
import type { Noticed } from "../src/my-page/write-ending";
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

const editing = (
  state = set(),
  draft = state,
  notice: Noticed<CostumeSet> | null = null,
): EditorStep => ({ name: "editing", editor: editorOf(state), draft, notice });
const saving = (state = set(), draft = state): EditorStep => ({
  name: "saving",
  editor: editorOf(state),
  draft,
});

const run = (step: EditorStep, ...actions: EditorAction[]) => actions.reduce(reduceEditor, step);

function draftOf(step: EditorStep): CostumeSet {
  if (step.name !== "editing" && step.name !== "saving") {
    throw new Error(`The ${step.name} step holds no draft`);
  }
  return step.draft;
}

describe("a read of the editor", () => {
  test("begins from nothing held when the editor has not been read", () => {
    expect(run(UNREAD, { type: "readStarted" })).toEqual({ name: "loading", held: null });
  });

  test("opens the editor on the set as read, with nothing yet changed and no notice", () => {
    const editor = editorOf(set({ colorFace: 9 }));
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: ok(editor) });

    expect(step).toEqual({ name: "editing", editor, draft: editor.state, notice: null });
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

    expect(step).toEqual({ name: "editing", editor: fresh, draft, notice: null });
  });

  test("drops a draft when the set has moved since it was made over it", () => {
    const moved = editorOf(set({ colorBody: 40 }));
    const step = run(
      editing(set(), set({ colorFace: 9 })),
      { type: "readStarted" },
      { type: "readEnded", result: ok(moved) },
    );

    expect(step).toEqual({ name: "editing", editor: moved, draft: moved.state, notice: null });
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

  test("takes the draft a write left as what a read again holds", () => {
    const left = set({ colorFace: 9 });
    const written = run(saving(set(), left), { type: "writeEnded", outcome: applied(set(), left) });

    expect(run(written, { type: "readStarted" })).toMatchObject({
      name: "loading",
      held: { draft: left },
    });
  });

  test("drops the notice of the last write, in the read and after it", () => {
    const outcome: Noticed<CostumeSet> = { kind: "interrupted" };
    const fresh = editorOf(set());
    const loading = run(editing(set(), set({ colorFace: 9 }), outcome), { type: "readStarted" });

    expect(loading).toEqual({
      name: "loading",
      held: { editor: editorOf(set()), draft: set({ colorFace: 9 }) },
    });
    expect(run(loading, { type: "readEnded", result: ok(fresh) })).toMatchObject({
      name: "editing",
      notice: null,
    });
  });

  type BusyCase = [label: string, step: EditorStep];
  test.each<BusyCase>([
    ["a save", saving()],
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
    ["a save", saving()],
    ["nothing read", UNREAD],
    ["a read", { name: "loading", held: null }],
  ])("picks nothing in %s", (_label, step) => {
    expect(reduceEditor(step, { type: "pickedColour", part: "colorFace", id: 9 })).toBe(step);
    expect(reduceEditor(step, { type: "pickedItem", part: "costume1", id: 36 })).toBe(step);
  });
});

describe("picking from the history", () => {
  const entrySet = set({ colorFace: 9, costume2: 0 });

  test("puts the set of an entry in the draft, whole, and leaves the set as read alone", () => {
    const step = run(editing(), { type: "pickedHistory", set: entrySet });

    expect(step).toEqual(editing(set(), entrySet));
  });

  test("replaces a draft that was made already", () => {
    const step = run(editing(set(), set({ colorBody: 40 })), {
      type: "pickedHistory",
      set: entrySet,
    });

    expect(draftOf(step)).toEqual(entrySet);
  });

  test("clears the notice of the last write", () => {
    const step = run(editing(set(), set(), { kind: "interrupted" }), {
      type: "pickedHistory",
      set: entrySet,
    });

    expect(step).toEqual(editing(set(), entrySet));
  });

  test("is the same step when the entry is the draft already", () => {
    const step = editing(set(), entrySet);

    expect(reduceEditor(step, { type: "pickedHistory", set: entrySet })).toBe(step);
  });

  test("can be saved at once, as any other change", () => {
    const step = run(editing(), { type: "pickedHistory", set: entrySet }, { type: "saveStarted" });

    expect(step).toEqual(saving(set(), entrySet));
  });

  test("leaves the set worn, picked back, with nothing to save", () => {
    const step = run(editing(set(), entrySet), { type: "pickedHistory", set: set() });

    expect(reduceEditor(step, { type: "saveStarted" })).toBe(step);
  });

  test.each<[label: string, step: EditorStep]>([
    ["a save", saving()],
    ["nothing read", UNREAD],
    ["a read", { name: "loading", held: null }],
  ])("picks nothing in %s", (_label, step) => {
    expect(reduceEditor(step, { type: "pickedHistory", set: entrySet })).toBe(step);
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

  test("resets nothing in a save", () => {
    const step = saving(set(), set({ colorFace: 9 }));

    expect(reduceEditor(step, { type: "reset" })).toBe(step);
  });
});

describe("the save", () => {
  const drafted = set({ colorFace: 9 });

  test("sends the draft from editing, over the set as read", () => {
    expect(run(editing(set(), drafted), { type: "saveStarted" })).toEqual(saving(set(), drafted));
  });

  test("sends nothing when the draft is the set as read", () => {
    const step = editing();

    expect(reduceEditor(step, { type: "saveStarted" })).toBe(step);
  });

  test.each<[label: string, step: EditorStep]>([
    ["a save", saving(set(), drafted)],
    ["nothing read", UNREAD],
    ["a read", { name: "loading", held: { editor: editorOf(), draft: drafted } }],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held: null }],
  ])("starts from no step but editing: not from %s", (_label, step) => {
    expect(reduceEditor(step, { type: "saveStarted" })).toBe(step);
  });

  test("clears the notice of the last write", () => {
    const step = editing(set(), drafted, { kind: "interrupted" });

    expect(run(step, { type: "saveStarted" })).toEqual(saving(set(), drafted));
  });
});

describe("the set and the draft a write leaves", () => {
  const before = set();
  const planned = set({ colorFace: 9 });
  const elsewhere = set({ colorBody: 40 });
  const drafted = set({ colorFace: 9, costume5: 0 });

  const notApplied: Noticed<CostumeSet> = {
    kind: "notApplied",
    before,
    after: before,
    reason: { kind: "unchanged" },
    save: SAVE,
    cross: "unchanged",
  };
  const diverged: Noticed<CostumeSet> = {
    kind: "diverged",
    before,
    expectedAfter: planned,
    after: elsewhere,
    save: SAVE,
    cross: "unchanged",
  };
  const appliedNotSynced: Noticed<CostumeSet> = {
    kind: "appliedNotSynced",
    before,
    after: planned,
    save: SAVE,
    cross: "unchanged",
  };
  const changedSincePreview: Noticed<CostumeSet> = {
    kind: "changedSincePreview",
    current: elsewhere,
  };

  test("after applied the editor and the draft hold the set the write read back, and nothing is said", () => {
    const step = run(saving(before, drafted), {
      type: "writeEnded",
      outcome: applied(before, planned),
    });

    expect(step).toEqual({
      name: "editing",
      editor: editorOf(planned),
      draft: planned,
      notice: null,
    });
  });

  type OutcomeCase = [
    label: string,
    outcome: Noticed<CostumeSet>,
    state: CostumeSet,
    draft: CostumeSet,
  ];
  test.each<OutcomeCase>([
    ["appliedNotSynced", appliedNotSynced, planned, planned],
    ["notApplied", notApplied, before, drafted],
    ["diverged", diverged, elsewhere, drafted],
    ["changedSincePreview", changedSincePreview, elsewhere, drafted],
    ["maintenance", { kind: "maintenance" }, before, drafted],
    ["invalidTarget", { kind: "invalidTarget", field: "costume1" }, before, drafted],
    ["nothingToChange", { kind: "nothingToChange" }, before, drafted],
    ["interrupted", { kind: "interrupted" }, before, drafted],
    ["busy", { kind: "busy" }, before, drafted],
  ])(
    "after %s the editor holds the set the write read back, the draft is as it should be, and the ending is the notice",
    (_label, outcome, state, draft) => {
      const step = run(saving(before, drafted), { type: "writeEnded", outcome });

      expect(step).toEqual({ name: "editing", editor: editorOf(state), draft, notice: outcome });
    },
  );

  test("leaves a draft that a failed save can be pressed again with", () => {
    const failed = run(saving(before, drafted), { type: "writeEnded", outcome: notApplied });

    expect(run(failed, { type: "saveStarted" })).toEqual(saving(before, drafted));
  });

  test("ends nothing when no write is on its way", () => {
    const step = editing();

    expect(reduceEditor(step, { type: "writeEnded", outcome: applied(before, planned) })).toBe(
      step,
    );
  });
});

describe("the notice of a write", () => {
  const notice: Noticed<CostumeSet> = { kind: "interrupted" };
  const drafted = set({ colorFace: 9 });
  const noticed = () => editing(set(), drafted, notice);

  test("stays through nothing but the next pick, Reset, Save or read", () => {
    const step = noticed();

    expect(step).toMatchObject({ notice });
    expect(reduceEditor(step, { type: "pickedColour", part: "colorFace", id: 3 })).toMatchObject({
      draft: set({ colorFace: 3 }),
      notice: null,
    });
    expect(reduceEditor(step, { type: "pickedItem", part: "costume3", id: 70 })).toMatchObject({
      notice: null,
    });
    expect(reduceEditor(step, { type: "reset" })).toEqual(editing());
  });

  test("goes with a pick of what the draft holds already, which is still a pick", () => {
    const step = reduceEditor(noticed(), { type: "pickedColour", part: "colorFace", id: 9 });

    expect(step).toEqual(editing(set(), drafted));
  });

  test("is not on the step again when a pick changes nothing and there is none", () => {
    const step = editing(set(), drafted);

    expect(reduceEditor(step, { type: "pickedColour", part: "colorFace", id: 9 })).toBe(step);
  });
});

describe("forgetting the editor", () => {
  test.each<[label: string, step: EditorStep]>([
    ["a draft", editing(set(), set({ colorFace: 9 }))],
    ["a notice", editing(set(), set(), { kind: "interrupted" })],
    ["a save", saving()],
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
    ["a draft with a notice", editing(set(), drafted, { kind: "busy" }), drafted],
    ["a save", saving(set(), drafted), drafted],
  ])("draws the picture of the right set for %s", (_label, step, previewed) => {
    expect(previewSetOf(step)).toEqual(previewed);
  });

  type ReadCase = [label: string, step: EditorStep, mayRead: boolean];
  test.each<ReadCase>([
    ["a draft", editing(), true],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held: null }, true],
    ["a save", saving(), false],
    ["a read on its way", { name: "loading", held: null }, false],
  ])("lets the editor be read again from %s: %p", (_label, step, mayRead) => {
    expect(canReadEditorAgain(step)).toBe(mayRead);
  });

  test("calls a save writing, and nothing else", () => {
    const steps = [UNREAD, editing(), saving()];

    expect(steps.filter(isWriting).map((step) => step.name)).toEqual(["saving"]);
  });

  type ShownCase = [label: string, step: EditorStep, shown: boolean];
  test.each<ShownCase>([
    ["nothing read", UNREAD, false],
    ["a read on its way", { name: "loading", held }, false],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held }, false],
    ["a draft", editing(), true],
    ["a save", saving(), true],
  ])("shows the editor for %s: %p", (_label, step, shown) => {
    expect(showsEditor(step)).toBe(shown);
  });
  type OnScreenCase = [label: string, step: EditorStep, shown: ReturnType<typeof shownEditorOf>];
  test.each<OnScreenCase>([
    ["nothing read", UNREAD, null],
    ["a first read", { name: "loading", held: null }, null],
    ["a read again, shut", { name: "loading", held }, { ...held, shut: true }],
    ["a read that failed", { name: "loadFailed", failure: FAILURE, held }, null],
    ["a draft, open", editing(set(), drafted), { editor: editorOf(), draft: drafted, shut: false }],
    ["a save, shut", saving(set(), drafted), { editor: editorOf(), draft: drafted, shut: true }],
  ])("keeps the editor on screen for %s", (_label, step, shown) => {
    expect(shownEditorOf(step)).toEqual(shown);
  });
});
