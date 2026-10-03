import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading, type TitleOption } from "@abth/core";

import {
  canReadTitlesAgain,
  changesTitle,
  isWritingTitle,
  movedTheTitle,
  reduceTitle,
  type TitleAction,
  type TitleStep,
  UNREAD,
} from "../src/name-title/title-editor-state";
import type {
  ReadFailure,
  TitleEditorView,
  TitleState,
  WriteOutcomeView,
} from "../src/session-port";

const A: TitleOption = { id: 101, label: "サンプルの称号" };
const B: TitleOption = { id: 102, label: "別のサンプル称号" };
const C: TitleOption = { id: 103, label: "三つ目のサンプル称号" };
const OPTIONS = [A, B, C];
const viewOf = (
  title: string = A.label,
  options: readonly TitleOption[] = OPTIONS,
): TitleEditorView => ({
  state: { title },
  options,
});
const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const FAILURE: ReadFailure = { kind: "unreachable" };

const idle = (title = A.label, picked: TitleOption | null = null): TitleStep => ({
  name: "idle",
  editor: viewOf(title),
  picked,
});
const confirming = (picked: TitleOption = B): TitleStep => ({
  name: "confirming",
  editor: viewOf(),
  picked,
});
const saving: TitleStep = { name: "saving", editor: viewOf(), picked: B };
const undoing: TitleStep = { name: "undoing", editor: viewOf() };
const loading: TitleStep = { name: "loading", held: null };
const failed: TitleStep = { name: "loadFailed", failure: FAILURE, held: null };
const applied = (before: TitleState, after: TitleState): WriteOutcomeView<TitleState> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "unchanged",
});
const done = (
  outcome: WriteOutcomeView<TitleState> = applied({ title: A.label }, { title: B.label }),
): TitleStep => ({
  name: "done",
  editor: viewOf(B.label),
  outcome,
  asUndo: false,
});

const ALL_STEPS: [string, TitleStep][] = [
  ["unread", UNREAD],
  ["loading", loading],
  ["loadFailed", failed],
  ["idle", idle()],
  ["confirming", confirming()],
  ["saving", saving],
  ["undoing", undoing],
  ["done", done()],
];

const reduce = (step: TitleStep, ...actions: TitleAction[]) => actions.reduce(reduceTitle, step);

describe("reduceTitle, forgetting", () => {
  test.each(ALL_STEPS)("goes back to unread from %s", (_name, step) => {
    expect(reduce(step, { type: "forget" })).toBe(UNREAD);
  });
});

describe("reduceTitle, reading", () => {
  test("begins the first read from unread, holding nothing", () => {
    expect(reduce(UNREAD, { type: "readStarted" })).toEqual({ name: "loading", held: null });
  });

  test("begins a read again from idle, holding the list and the pick", () => {
    expect(reduce(idle(A.label, B), { type: "readStarted" })).toEqual({
      name: "loading",
      held: { editor: viewOf(), picked: B },
    });
  });

  test("begins a read again from an outcome, holding the list as the write left it and no pick", () => {
    expect(reduce(done(), { type: "readStarted" })).toEqual({
      name: "loading",
      held: { editor: viewOf(B.label), picked: null },
    });
  });

  test("begins a read again from a failed read, holding what it held", () => {
    const held = { editor: viewOf(), picked: C };
    expect(reduce({ name: "loadFailed", failure: FAILURE, held }, { type: "readStarted" })).toEqual(
      {
        name: "loading",
        held,
      },
    );
  });

  test.each([
    ["loading", loading],
    ["confirming", confirming()],
    ["saving", saving],
    ["undoing", undoing],
  ])("does not begin a read inside %s", (_name, step) => {
    expect(reduce(step, { type: "readStarted" })).toBe(step);
  });

  test("opens the list on a read that came", () => {
    expect(reduce(loading, { type: "readEnded", result: ok(viewOf()) })).toEqual(idle());
  });

  test("keeps the pick held from before while its title is still in the list, under its name", () => {
    const held = { editor: viewOf(), picked: B };
    const next = viewOf(A.label, [A, B]);
    expect(reduce({ name: "loading", held }, { type: "readEnded", result: ok(next) })).toEqual({
      name: "idle",
      editor: next,
      picked: B,
    });
  });

  test("drops the pick when its title left the list or now has another name", () => {
    const held = { editor: viewOf(), picked: B };
    for (const options of [
      [A, C],
      [A, { id: B.id, label: "改名された称号" }, C],
    ]) {
      const step = reduce(
        { name: "loading", held },
        { type: "readEnded", result: ok(viewOf(A.label, options)) },
      );
      expect(step).toMatchObject({ name: "idle", picked: null });
    }
  });

  test("holds on to what it had for a read that failed", () => {
    const held = { editor: viewOf(), picked: B };
    expect(reduce({ name: "loading", held }, { type: "readEnded", result: err(FAILURE) })).toEqual({
      name: "loadFailed",
      failure: FAILURE,
      held,
    });
  });

  test("ignores a read that ends when none was on its way", () => {
    const step = idle();
    expect(reduce(step, { type: "readEnded", result: ok(viewOf()) })).toBe(step);
  });
});

describe("reduceTitle, picking and reviewing", () => {
  test("picks a title in idle, and clears the pick", () => {
    expect(reduce(idle(), { type: "picked", option: B })).toEqual(idle(A.label, B));
    expect(reduce(idle(A.label, B), { type: "picked", option: null })).toEqual(idle());
  });

  test("leaves the very same step for the pick it holds already", () => {
    const step = idle(A.label, B);
    expect(reduce(step, { type: "picked", option: B })).toBe(step);
  });

  test.each(ALL_STEPS.filter(([name]) => name !== "idle"))("takes no pick in %s", (_name, step) => {
    expect(reduce(step, { type: "picked", option: C })).toBe(step);
  });

  test("lists a pick that would change the title, for a last look", () => {
    expect(reduce(idle(A.label, B), { type: "review" })).toEqual(confirming(B));
  });

  test("lists nothing without a pick, or for a pick that is the title worn", () => {
    const none = idle();
    const same = idle(A.label, A);
    expect(reduce(none, { type: "review" })).toBe(none);
    expect(reduce(same, { type: "review" })).toBe(same);
  });

  test("reads the pages' different white space as the same title: a pick of it is no change", () => {
    const worn: TitleOption = { id: 1, label: "称号 A" };
    const step: TitleStep = {
      name: "idle",
      editor: viewOf("称号\u{a0}A", [worn]),
      picked: worn,
    };
    expect(reduce(step, { type: "review" })).toBe(step);
    expect(changesTitle(viewOf("称号\u{a0}A", [worn]), worn)).toBe(false);
  });

  test("goes back from a review to the pick, and from an outcome to the title it left, picking none", () => {
    expect(reduce(confirming(C), { type: "back" })).toEqual(idle(A.label, C));
    expect(reduce(done(), { type: "back" })).toEqual({
      name: "idle",
      editor: viewOf(B.label),
      picked: null,
    });
  });
});

describe("reduceTitle, saving and undoing", () => {
  test("sends only what was listed", () => {
    expect(reduce(confirming(), { type: "saveStarted" })).toEqual(saving);
    const step = idle(A.label, B);
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });

  test("begins an undo from idle or from an outcome, holding no pick", () => {
    expect(reduce(idle(A.label, B), { type: "undoStarted" })).toEqual(undoing);
    expect(reduce(done(), { type: "undoStarted" })).toEqual({
      name: "undoing",
      editor: viewOf(B.label),
    });
  });

  test.each([
    ["unread", UNREAD],
    ["loading", loading],
    ["confirming", confirming()],
    ["saving", saving],
    ["undoing", undoing],
  ])("begins no undo from %s", (_name, step) => {
    expect(reduce(step, { type: "undoStarted" })).toBe(step);
  });

  test("ends a save as an outcome over the title as it read back", () => {
    const outcome = applied({ title: A.label }, { title: B.label });
    expect(reduce(saving, { type: "writeEnded", outcome })).toEqual({
      name: "done",
      editor: viewOf(B.label),
      outcome,
      asUndo: false,
    });
  });

  test("ends an undo as an outcome that says it was one", () => {
    const outcome = applied({ title: B.label }, { title: A.label });
    expect(reduce(undoing, { type: "writeEnded", outcome })).toMatchObject({
      name: "done",
      editor: viewOf(A.label),
      asUndo: true,
    });
  });

  test("shows the title a write found when it stopped because the title had moved", () => {
    const outcome: WriteOutcomeView<TitleState> = {
      kind: "changedSincePreview",
      current: { title: C.label },
    };
    expect(reduce(saving, { type: "writeEnded", outcome })).toMatchObject({
      name: "done",
      editor: viewOf(C.label),
    });
  });

  test("leaves the list as it was for an ending that says nothing of the title", () => {
    const outcome: WriteOutcomeView<TitleState> = { kind: "busy" };
    expect(reduce(saving, { type: "writeEnded", outcome })).toMatchObject({
      name: "done",
      editor: viewOf(),
    });
  });

  test("ignores a write that ends when none was on its way", () => {
    const step = idle();
    expect(reduce(step, { type: "writeEnded", outcome: { kind: "busy" } })).toBe(step);
  });
});

describe("what a step allows", () => {
  test("may read the list again from idle, an outcome and a failed read alone", () => {
    expect(ALL_STEPS.filter(([, step]) => canReadTitlesAgain(step)).map(([name]) => name)).toEqual([
      "loadFailed",
      "idle",
      "done",
    ]);
  });

  test("is writing in a save and an undo alone", () => {
    expect(ALL_STEPS.filter(([, step]) => isWritingTitle(step)).map(([name]) => name)).toEqual([
      "saving",
      "undoing",
    ]);
  });

  test.each<[WriteOutcomeView<TitleState>["kind"], boolean]>([
    ["applied", true],
    ["appliedNotSynced", true],
    ["diverged", true],
    ["changedSincePreview", true],
    ["notApplied", false],
    ["nothingToChange", false],
    ["invalidTarget", false],
    ["maintenance", false],
    ["busy", false],
    ["interrupted", false],
    ["outcomeUnknown", false],
    ["sessionGone", false],
  ])("says my page is stale after %s: %p", (kind, stale) => {
    expect(movedTheTitle({ kind })).toBe(stale);
  });
});
