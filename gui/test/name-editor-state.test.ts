import { describe, expect, test } from "bun:test";
import type { SaveReading } from "@abth/core";

import type { Noticed } from "../src/my-page/write-ending";
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
const refusedOutcome: Noticed<NameState> = {
  kind: "notApplied",
  before: OLD,
  after: OLD,
  reason: { kind: "refused", code: 1, message: "不適切用語は使用できません" },
  save: SAVE,
  cross: "unchanged",
};
const notSyncedOutcome: Noticed<NameState> = {
  kind: "appliedNotSynced",
  before: OLD,
  after: NEW,
  save: SAVE,
  cross: "off",
};

const idle = (typed: string | null, notice: Noticed<NameState> | null = null): NameStep => ({
  name: "idle",
  typed,
  notice,
});
const saving = (typed: string | null = NEW.nickname): NameStep => ({ name: "saving", typed });

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

  test("drops the notice of the last write at the next typing, the same text included", () => {
    const step = idle("あたらしい", refusedOutcome);
    expect(reduce(step, { type: "typed", value: "あたらしい" })).toEqual(idle("あたらしい"));
    expect(reduce(step, { type: "typed", value: "あたらし" })).toEqual(idle("あたらし"));
  });

  test("takes no typing while a save runs", () => {
    const step = saving();
    expect(reduce(step, { type: "typed", value: "x" })).toBe(step);
  });

  test("forgets what was typed, and the notice, with the session", () => {
    for (const step of [idle("あ"), idle("あ", refusedOutcome), saving()]) {
      expect(reduce(step, { type: "forget" })).toBe(IDLE);
    }
  });
});

describe("reduceName, dropping the edits on leaving the page", () => {
  test.each<[label: string, step: NameStep]>([
    ["a name typed", idle("あたらしい")],
    ["a notice", idle(null, notSyncedOutcome)],
    ["a name typed and a notice", idle("あたらしい", refusedOutcome)],
  ])("puts the field back to the name worn, and clears the notice, over %s", (_label, step) => {
    expect(reduce(step, { type: "editsDropped" })).toBe(IDLE);
  });

  test("leaves the very same step for a field never typed in, with nothing said", () => {
    expect(reduce(IDLE, { type: "editsDropped" })).toBe(IDLE);
  });

  test("drops nothing in a save", () => {
    const step = saving();
    expect(reduce(step, { type: "editsDropped" })).toBe(step);
  });
});

describe("reduceName, saving", () => {
  test("starts a save from the field, holding what was typed", () => {
    expect(reduce(idle("あたらしい"), { type: "saveStarted" })).toEqual(saving("あたらしい"));
    expect(reduce(IDLE, { type: "saveStarted" })).toEqual(saving(null));
  });

  test("drops the notice of the last write when the next save starts", () => {
    expect(reduce(idle("あたらしい", refusedOutcome), { type: "saveStarted" })).toEqual(
      saving("あたらしい"),
    );
  });

  test("starts none inside a save", () => {
    const step = saving();
    expect(reduce(step, { type: "saveStarted" })).toBe(step);
  });

  test("is writing in a save alone", () => {
    expect([IDLE, idle("あ", refusedOutcome), saving()].map(isWritingName)).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe("reduceName, a write's ending", () => {
  test("shows the name worn in the field after a save that read back as planned, and says nothing", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: applied(OLD, NEW) })).toEqual(
      idle(null),
    );
  });

  test("keeps what was typed, and says why, after a name Hiroba refused", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: refusedOutcome })).toEqual(
      idle(NEW.nickname, refusedOutcome),
    );
  });

  test("shows the name worn, and says so, after a save the game server was not told of", () => {
    expect(reduce(saving(), { type: "writeEnded", outcome: notSyncedOutcome })).toEqual(
      idle(null, notSyncedOutcome),
    );
  });

  test("ignores a write that ends when none was on its way", () => {
    const step = idle("あ");
    expect(reduce(step, { type: "writeEnded", outcome: { kind: "busy" } })).toBe(step);
  });
});

describe("nameAfter", () => {
  test("gives the name a write read back, whether or not it went as planned", () => {
    expect(nameAfter(applied(OLD, NEW))).toBe(NEW.nickname);
    expect(nameAfter(notSyncedOutcome)).toBe(NEW.nickname);
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
