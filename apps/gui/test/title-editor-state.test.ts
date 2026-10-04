import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading, type TitleOption } from "@abth/core";

import type { Noticed } from "../src/my-page/write-ending";
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

const idle = (
  title = A.label,
  picked: TitleOption | null = null,
  notice: Noticed<TitleState> | null = null,
): TitleStep => ({
  name: "idle",
  editor: viewOf(title),
  picked,
  notice,
});
const saving: TitleStep = { name: "saving", editor: viewOf(), picked: B };
const loading: TitleStep = { name: "loading", held: null };
const failed: TitleStep = { name: "loadFailed", failure: FAILURE, held: null };
const applied = (before: TitleState, after: TitleState): WriteOutcomeView<TitleState> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "unchanged",
});
const refused: Noticed<TitleState> = {
  kind: "notApplied",
  before: { title: A.label },
  after: { title: A.label },
  reason: { kind: "refused", code: 5, message: null },
  save: SAVE,
  cross: "unchanged",
};

const ALL_STEPS: [string, TitleStep][] = [
  ["unread", UNREAD],
  ["loading", loading],
  ["loadFailed", failed],
  ["idle", idle()],
  ["saving", saving],
];

const reduce = (step: TitleStep, ...actions: TitleAction[]) => actions.reduce(reduceTitle, step);

describe("reduceTitle, forgetting", () => {
  test.each(ALL_STEPS)("goes back to unread from %s", (_name, step) => {
    expect(reduce(step, { type: "forget" })).toBe(UNREAD);
  });

  test("forgets the notice of the last write too", () => {
    expect(reduce(idle(A.label, null, refused), { type: "forget" })).toBe(UNREAD);
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
    ["saving", saving],
  ])("does not begin a read inside %s", (_name, step) => {
    expect(reduce(step, { type: "readStarted" })).toBe(step);
  });

  test("opens the list on a read that came, with no notice", () => {
    expect(reduce(loading, { type: "readEnded", result: ok(viewOf()) })).toEqual(idle());
  });

  test("keeps the pick held from before while its title is still in the list, under its name", () => {
    const held = { editor: viewOf(), picked: B };
    const next = viewOf(A.label, [A, B]);
    expect(reduce({ name: "loading", held }, { type: "readEnded", result: ok(next) })).toEqual({
      name: "idle",
      editor: next,
      picked: B,
      notice: null,
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

describe("reduceTitle, picking", () => {
  test("picks a title in idle, and clears the pick", () => {
    expect(reduce(idle(), { type: "picked", option: B })).toEqual(idle(A.label, B));
    expect(reduce(idle(A.label, B), { type: "picked", option: null })).toEqual(idle());
  });

  test("leaves the very same step for the pick it holds already", () => {
    const step = idle(A.label, B);
    expect(reduce(step, { type: "picked", option: B })).toBe(step);
  });

  test("drops the notice of the last write at the next pick, the same one included", () => {
    expect(reduce(idle(A.label, B, refused), { type: "picked", option: C })).toEqual(
      idle(A.label, C),
    );
    expect(reduce(idle(A.label, B, refused), { type: "picked", option: B })).toEqual(
      idle(A.label, B),
    );
  });

  test.each(ALL_STEPS.filter(([name]) => name !== "idle"))("takes no pick in %s", (_name, step) => {
    expect(reduce(step, { type: "picked", option: C })).toBe(step);
  });

  test("reads the pages' different white space as the same title: a pick of it is no change", () => {
    const worn: TitleOption = { id: 1, label: "称号 A" };
    const step: TitleStep = {
      name: "idle",
      editor: viewOf("称号\u{a0}A", [worn]),
      picked: worn,
      notice: null,
    };
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
    expect(changesTitle(viewOf("称号\u{a0}A", [worn]), worn)).toBe(false);
  });
});

describe("reduceTitle, saving", () => {
  test("starts a save from a pick that would change the title, holding the list and the pick", () => {
    expect(reduce(idle(A.label, B), { type: "saveStarted" })).toEqual(saving);
  });

  test("drops the notice of the last write when the next save starts", () => {
    expect(reduce(idle(A.label, B, refused), { type: "saveStarted" })).toEqual(saving);
  });

  test("starts none without a pick, or for a pick that is the title worn", () => {
    const none = idle();
    const same = idle(A.label, A);
    expect(reduce(none, { type: "saveStarted" })).toBe(none);
    expect(reduce(same, { type: "saveStarted" })).toBe(same);
  });

  test.each(ALL_STEPS.filter(([name]) => name !== "idle"))("starts none in %s", (_name, step) => {
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });
});

describe("reduceTitle, a write's ending", () => {
  test("shows the title as it read back, picks none and says nothing after a save that applied", () => {
    const outcome = applied({ title: A.label }, { title: B.label });
    expect(reduce(saving, { type: "writeEnded", outcome })).toEqual(idle(B.label));
  });

  test("keeps the pick and says why after a save the site refused, over the title as it was", () => {
    expect(reduce(saving, { type: "writeEnded", outcome: refused })).toEqual(
      idle(A.label, B, refused),
    );
  });

  test("picks none and says so after a save the game server was not told of", () => {
    const outcome: Noticed<TitleState> = {
      kind: "appliedNotSynced",
      before: { title: A.label },
      after: { title: B.label },
      save: SAVE,
      cross: "unchanged",
    };
    expect(reduce(saving, { type: "writeEnded", outcome })).toEqual(idle(B.label, null, outcome));
  });

  test("shows the title a write found when it stopped because the title had moved, keeping the pick", () => {
    const outcome: Noticed<TitleState> = {
      kind: "changedSincePreview",
      current: { title: C.label },
    };
    expect(reduce(saving, { type: "writeEnded", outcome })).toEqual(idle(C.label, B, outcome));
  });

  test("leaves the list as it was for an ending that says nothing of the title", () => {
    const outcome: Noticed<TitleState> = { kind: "busy" };
    expect(reduce(saving, { type: "writeEnded", outcome })).toEqual(idle(A.label, B, outcome));
  });

  test("ignores a write that ends when none was on its way", () => {
    const step = idle();
    expect(reduce(step, { type: "writeEnded", outcome: { kind: "busy" } })).toBe(step);
  });
});

describe("what a step allows", () => {
  test("may read the list again from idle and a failed read alone", () => {
    expect(ALL_STEPS.filter(([, step]) => canReadTitlesAgain(step)).map(([name]) => name)).toEqual([
      "loadFailed",
      "idle",
    ]);
  });

  test("is writing in a save alone", () => {
    expect(ALL_STEPS.filter(([, step]) => isWritingTitle(step)).map(([name]) => name)).toEqual([
      "saving",
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
