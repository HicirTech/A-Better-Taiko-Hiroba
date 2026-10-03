import { describe, expect, test } from "bun:test";
import type { SaveReading } from "@abth/core";

import {
  IDLE,
  isWritingName,
  judgeName,
  type NameAction,
  type NameStep,
  nameAfter,
  reduceName,
  type WornName,
} from "../src/name-title/name-editor-state";
import type { NameState, WriteOutcomeView } from "../src/session-port";

const WORN: WornName = { nickname: "サンプルどん", rename: "open" };
const OLD: NameState = { nickname: WORN.nickname };
const NEW: NameState = { nickname: "あたらしい" };
const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const NUL = String.fromCharCode(0);

const applied = (before: NameState, after: NameState): WriteOutcomeView<NameState> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "unchanged",
});
const refusedOutcome: WriteOutcomeView<NameState> = {
  kind: "notApplied",
  before: OLD,
  after: OLD,
  reason: { kind: "refused", code: 1, message: "不適切用語は使用できません" },
  save: SAVE,
  cross: "unchanged",
};

const idle = (typed: string | null): NameStep => ({ name: "idle", typed });
const confirming = (typed: string | null = NEW.nickname): NameStep => ({
  name: "confirming",
  typed,
  expected: OLD,
  target: NEW,
});
const saving = (typed: string | null = NEW.nickname): NameStep => ({
  name: "saving",
  typed,
  expected: OLD,
  target: NEW,
});
const undoing = (typed: string | null = null): NameStep => ({ name: "undoing", typed });
const done = (
  outcome: WriteOutcomeView<NameState>,
  typed: string | null = NEW.nickname,
  asUndo = false,
): NameStep => ({ name: "done", typed, outcome, asUndo });

const reduce = (step: NameStep, ...actions: NameAction[]) => actions.reduce(reduceName, step);

describe("judgeName", () => {
  test("takes the name typed, as it is, for a change the form takes", () => {
    expect(judgeName("あたらしい", WORN)).toEqual({ kind: "ok", target: NEW });
  });

  test("trims the name before it judges, so white space at its ends is never the fault", () => {
    expect(judgeName("  あたらしい\u{3000}\t", WORN)).toEqual({ kind: "ok", target: NEW });
    expect(judgeName(`${WORN.nickname}\u{a0}`, WORN)).toEqual({ kind: "same" });
  });

  test("shows the name worn for a field that was never typed in, which is no change", () => {
    expect(judgeName(null, WORN)).toEqual({ kind: "same" });
    expect(judgeName(WORN.nickname, WORN)).toEqual({ kind: "same" });
  });

  test("calls a name of nothing but white space empty", () => {
    expect(judgeName("", WORN)).toEqual({ kind: "empty" });
    expect(judgeName(" \u{3000} ", WORN)).toEqual({ kind: "empty" });
  });

  test("refuses a name longer than the form takes, by the core's field", () => {
    expect(judgeName("あ".repeat(10), WORN)).toMatchObject({ kind: "ok" });
    expect(judgeName("あ".repeat(11), WORN)).toEqual({ kind: "refused", field: "name.tooLong" });
  });

  test("refuses a character that cannot be sent, by the core's field", () => {
    expect(judgeName(`あ${NUL}い`, WORN)).toEqual({ kind: "refused", field: "name.control" });
  });

  test("refuses every name while the page says renames are closed, and takes one while it does not say", () => {
    const closed: WornName = { ...WORN, rename: "closed" };
    expect(judgeName("あたらしい", closed)).toEqual({ kind: "refused", field: "name.closed" });
    expect(judgeName("あたらしい", { ...WORN, rename: "unknown" })).toEqual({
      kind: "ok",
      target: NEW,
    });
  });

  test("judges the long half-width names the help page does not list as the form would: by its length", () => {
    expect(judgeName("abcdefghij", WORN)).toMatchObject({ kind: "ok" });
    expect(judgeName("abcdefghijk", WORN)).toEqual({ kind: "refused", field: "name.tooLong" });
  });
});

describe("reduceName, the field", () => {
  test("holds what was typed in idle, and shows the name worn until then", () => {
    expect(reduce(IDLE, { type: "typed", value: "あ" })).toEqual(idle("あ"));
    expect(IDLE).toEqual(idle(null));
  });

  test("leaves the very same step for the text it holds already", () => {
    const step = idle("あ");
    expect(reduce(step, { type: "typed", value: "あ" })).toBe(step);
  });

  test.each([
    ["confirming", confirming()],
    ["saving", saving()],
    ["undoing", undoing()],
    ["done", done(applied(OLD, NEW))],
  ])("takes no typing in %s", (_name, step) => {
    expect(reduce(step, { type: "typed", value: "x" })).toBe(step);
  });

  test("forgets what was typed with the session", () => {
    for (const step of [idle("あ"), confirming(), saving(), undoing(), done(applied(OLD, NEW))]) {
      expect(reduce(step, { type: "forget" })).toBe(IDLE);
    }
  });
});

describe("reduceName, reviewing and sending", () => {
  test("lists a name that would change the one worn, for a last look", () => {
    expect(reduce(idle("あたらしい"), { type: "review", worn: WORN })).toEqual(confirming());
  });

  test("lists the trimmed name, and keeps what was typed", () => {
    expect(reduce(idle(" あたらしい "), { type: "review", worn: WORN })).toEqual({
      name: "confirming",
      typed: " あたらしい ",
      expected: OLD,
      target: NEW,
    });
  });

  test.each([
    ["the name worn", idle(null)],
    ["nothing", idle("")],
    ["a name too long", idle("あ".repeat(11))],
  ])("lists nothing for %s", (_name, step) => {
    expect(reduce(step, { type: "review", worn: WORN })).toBe(step);
  });

  test("lists nothing while the page says renames are closed", () => {
    const step = idle("あたらしい");
    expect(reduce(step, { type: "review", worn: { ...WORN, rename: "closed" } })).toBe(step);
  });

  test("goes back from a review to the field, as it was typed", () => {
    expect(reduce(confirming(), { type: "back" })).toEqual(idle(NEW.nickname));
  });

  test("goes back from an outcome to the field: a refused name is still in it", () => {
    expect(reduce(done(refusedOutcome), { type: "back" })).toEqual(idle(NEW.nickname));
  });

  test("sends only what was listed", () => {
    expect(reduce(confirming(), { type: "saveStarted" })).toEqual(saving());
    const step = idle("あたらしい");
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });

  test("begins an undo from idle or from an outcome, and from nowhere else", () => {
    expect(reduce(idle(null), { type: "undoStarted" })).toEqual(undoing());
    expect(reduce(done(applied(OLD, NEW)), { type: "undoStarted" })).toEqual(undoing(NEW.nickname));
    for (const step of [confirming(), saving(), undoing()]) {
      expect(reduce(step, { type: "undoStarted" })).toBe(step);
    }
  });
});

describe("reduceName, a write's ending", () => {
  test("shows the name worn in the field after a save that read back as planned", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: applied(OLD, NEW) })).toEqual(
      done(applied(OLD, NEW), null),
    );
  });

  test("keeps what was typed after a name Hiroba refused", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: refusedOutcome })).toEqual(
      done(refusedOutcome, NEW.nickname),
    );
  });

  test("ends an undo as an outcome that says it was one", () => {
    expect(reduce(undoing(), { type: "writeEnded", outcome: applied(NEW, OLD) })).toEqual(
      done(applied(NEW, OLD), null, true),
    );
  });

  test("ignores a write that ends when none was on its way", () => {
    const step = idle("あ");
    expect(reduce(step, { type: "writeEnded", outcome: { kind: "busy" } })).toBe(step);
  });

  test("is writing in a save and an undo alone", () => {
    expect(
      [IDLE, confirming(), saving(), undoing(), done(refusedOutcome)].map(isWritingName),
    ).toEqual([false, false, true, true, false]);
  });
});

describe("nameAfter", () => {
  test("gives the name a write read back, whether or not it went as planned", () => {
    expect(nameAfter(applied(OLD, NEW))).toBe(NEW.nickname);
    expect(
      nameAfter({ kind: "appliedNotSynced", before: OLD, after: NEW, save: SAVE, cross: "off" }),
    ).toBe(NEW.nickname);
    expect(nameAfter(refusedOutcome)).toBe(OLD.nickname);
    expect(
      nameAfter({
        kind: "diverged",
        before: OLD,
        expectedAfter: NEW,
        after: { nickname: "べつ" },
        save: SAVE,
        cross: "off",
      }),
    ).toBe("べつ");
  });

  test("gives the name a write found when it stopped because the name had moved", () => {
    expect(nameAfter({ kind: "changedSincePreview", current: { nickname: "べつ" } })).toBe("べつ");
  });

  test("gives none for an ending that says nothing of the name", () => {
    for (const outcome of [
      { kind: "busy" },
      { kind: "maintenance" },
      { kind: "interrupted" },
      { kind: "nothingToChange" },
      { kind: "invalidTarget", field: "name.closed" },
    ] as const) {
      expect(nameAfter(outcome)).toBeNull();
    }
  });
});
