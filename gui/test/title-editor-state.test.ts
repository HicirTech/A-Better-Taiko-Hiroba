import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading, type TitleOption } from "@abth/core";

import type { Noticed } from "../src/my-page/write-ending";
import {
  canSaveTitle,
  changesTitle,
  IDLE,
  isWritingTitle,
  mayReadTitles,
  movedTheTitle,
  reduceTitle,
  type TitleAction,
  type TitleList,
  type TitleStep,
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
const viewOf = (options: readonly TitleOption[] = OPTIONS): TitleEditorView => ({
  state: { title: A.label },
  options,
});
const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const FAILURE: ReadFailure = { kind: "unreachable" };

const unread: TitleList = { name: "unread" };
const loading: TitleList = { name: "loading" };
const failed: TitleList = { name: "failed", failure: FAILURE };
const listed = (options: readonly TitleOption[] = OPTIONS): TitleList => ({
  name: "read",
  options,
});

const idle = (
  list: TitleList = unread,
  picked: TitleOption | null = null,
  notice: Noticed<TitleState> | null = null,
): TitleStep => ({ name: "idle", list, picked, notice });
const saving = (list: TitleList = listed()): TitleStep => ({ name: "saving", list, picked: B });
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
  ["unread", idle()],
  ["loading", idle(loading)],
  ["failed", idle(failed)],
  ["read", idle(listed())],
  ["saving", saving()],
];

const reduce = (step: TitleStep, ...actions: TitleAction[]) => actions.reduce(reduceTitle, step);

describe("reduceTitle, forgetting", () => {
  test.each(ALL_STEPS)("goes back to the start from %s", (_name, step) => {
    expect(reduce(step, { type: "forget" })).toBe(IDLE);
  });

  test("forgets the notice of the last write and the pick too", () => {
    expect(reduce(idle(listed(), B, refused), { type: "forget" })).toBe(IDLE);
  });

  test("forgets the list and the notice of the last write, and keeps the pick", () => {
    expect(reduce(idle(listed(), B, refused), { type: "listForgotten" })).toEqual(
      idle(unread, B, null),
    );
    expect(reduce(idle(failed, B), { type: "listForgotten" })).toEqual(idle(unread, B));
  });

  test.each([
    ["an unread list with no notice", idle()],
    ["a save on its way", saving()],
  ])("leaves %s as it is", (_name, step) => {
    expect(reduce(step, { type: "listForgotten" })).toBe(step);
  });
});

describe("reduceTitle, reading", () => {
  test("begins the first read from an unread list", () => {
    expect(reduce(idle(), { type: "readStarted" })).toEqual(idle(loading));
  });

  test("begins a read again from a failed one", () => {
    expect(reduce(idle(failed), { type: "readStarted" })).toEqual(idle(loading));
  });

  test("keeps the pick and the notice of the last write while it reads", () => {
    expect(reduce(idle(unread, B, refused), { type: "readStarted" })).toEqual(
      idle(loading, B, refused),
    );
  });

  test.each([
    ["a list being read", idle(loading)],
    ["a list read already", idle(listed())],
    ["a save on its way", saving(unread)],
  ])("does not begin a read for %s", (_name, step) => {
    expect(reduce(step, { type: "readStarted" })).toBe(step);
  });

  test("lists the titles on a read that came", () => {
    expect(reduce(idle(loading), { type: "readEnded", result: ok(viewOf()) })).toEqual(
      idle(listed()),
    );
  });

  test("keeps the pick held from before while its title is still in the list, under its name", () => {
    const next = [A, B];
    expect(
      reduce(idle(loading, B, refused), { type: "readEnded", result: ok(viewOf(next)) }),
    ).toEqual(idle(listed(next), B, refused));
  });

  test("drops the pick when its title left the list or now has another name", () => {
    for (const options of [
      [A, C],
      [A, { id: B.id, label: "改名された称号" }, C],
    ]) {
      const step = reduce(idle(loading, B), { type: "readEnded", result: ok(viewOf(options)) });
      expect(step).toEqual(idle(listed(options), null));
    }
  });

  test("says the read failed, keeping the pick", () => {
    expect(reduce(idle(loading, B), { type: "readEnded", result: err(FAILURE) })).toEqual(
      idle(failed, B),
    );
  });

  test.each([
    ["no read on its way", idle()],
    ["a list read already", idle(listed())],
    ["a save on its way", saving(loading)],
  ])("ignores a read that ends with %s", (_name, step) => {
    expect(reduce(step, { type: "readEnded", result: ok(viewOf()) })).toBe(step);
  });
});

describe("reduceTitle, picking", () => {
  test("picks a title in idle, and clears the pick", () => {
    expect(reduce(idle(listed()), { type: "picked", option: B })).toEqual(idle(listed(), B));
    expect(reduce(idle(listed(), B), { type: "picked", option: null })).toEqual(idle(listed()));
  });

  test("leaves the very same step for the pick it holds already", () => {
    const step = idle(listed(), B);
    expect(reduce(step, { type: "picked", option: B })).toBe(step);
  });

  test("drops the notice of the last write at the next pick, the same one included", () => {
    expect(reduce(idle(unread, B, refused), { type: "picked", option: C })).toEqual(
      idle(unread, C),
    );
    expect(reduce(idle(unread, B, refused), { type: "picked", option: B })).toEqual(
      idle(unread, B),
    );
  });

  test("takes no pick in a save", () => {
    const step = saving();
    expect(reduce(step, { type: "picked", option: C })).toBe(step);
  });
});

describe("reduceTitle, saving", () => {
  test("starts a save from a pick, holding the list and the pick", () => {
    expect(reduce(idle(listed(), B), { type: "saveStarted" })).toEqual(saving());
    expect(reduce(idle(unread, B), { type: "saveStarted" })).toEqual(saving(unread));
  });

  test("drops the notice of the last write when the next save starts", () => {
    expect(reduce(idle(listed(), B, refused), { type: "saveStarted" })).toEqual(saving());
  });

  test("starts none without a pick", () => {
    const step = idle(listed());
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });

  test("starts none in a save already", () => {
    const step = saving();
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });
});

describe("reduceTitle, a write's ending", () => {
  test("forgets the list and says nothing after a save that applied", () => {
    const outcome = applied({ title: A.label }, { title: B.label });
    expect(reduce(saving(), { type: "writeEnded", outcome })).toEqual(idle());
  });

  test("keeps the pick and says why after a save the site refused, forgetting the list", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: refused })).toEqual(
      idle(unread, B, refused),
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
    expect(reduce(saving(), { type: "writeEnded", outcome })).toEqual(idle(unread, null, outcome));
  });

  test("keeps the pick when a write stopped because the title had moved", () => {
    const outcome: Noticed<TitleState> = {
      kind: "changedSincePreview",
      current: { title: C.label },
    };
    expect(reduce(saving(), { type: "writeEnded", outcome })).toEqual(idle(unread, B, outcome));
  });

  test("keeps the pick for an ending that says nothing of the title", () => {
    const outcome: Noticed<TitleState> = { kind: "busy" };
    expect(reduce(saving(), { type: "writeEnded", outcome })).toEqual(idle(unread, B, outcome));
  });

  test("ignores a write that ends when none was on its way", () => {
    const step = idle(listed());
    expect(reduce(step, { type: "writeEnded", outcome: { kind: "busy" } })).toBe(step);
  });
});

describe("what a step allows", () => {
  test("may read the list from idle with the list unread or failed, and no other step", () => {
    expect(ALL_STEPS.filter(([, step]) => mayReadTitles(step)).map(([name]) => name)).toEqual([
      "unread",
      "failed",
    ]);
  });

  test("is writing in a save alone", () => {
    expect(ALL_STEPS.filter(([, step]) => isWritingTitle(step)).map(([name]) => name)).toEqual([
      "saving",
    ]);
  });

  test("saves a pick of a title other than the one worn, and nothing else", () => {
    expect(canSaveTitle(idle(listed(), B), A.label)).toBe(true);
    expect(canSaveTitle(idle(unread, B), "")).toBe(true);
    expect(canSaveTitle(idle(listed(), A), A.label)).toBe(false);
    expect(canSaveTitle(idle(listed()), A.label)).toBe(false);
    expect(canSaveTitle(saving(), A.label)).toBe(false);
  });

  test("reads the pages' different white space as the same title: a pick of it is no change", () => {
    const worn: TitleOption = { id: 1, label: "称号 A" };
    expect(changesTitle("称号\u{a0}A", worn)).toBe(false);
    expect(canSaveTitle(idle(listed([worn]), worn), "称号\u{a0}A")).toBe(false);
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
