/** The undo record's pure rules: how each way a write ends settles it, and how a later read does. */
import { describe, expect, test } from "bun:test";

import {
  beginPending,
  EMPTY_UNDO_SLOT,
  offeredUndo,
  type PendingUndo,
  reconcile,
  type SaveReading,
  settle,
  type UndoRecord,
  type UndoSlot,
  undoInput,
  type WriteOutcome,
} from "../src/index";

interface Value {
  readonly n: number;
}

const same = (left: Value, right: Value) => left.n === right.n;
const TAIKO_NO = "000000000000";
const AT = "2026-09-27T03:00:00.000Z";
const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "" };
const v = (n: number): Value => ({ n });

const change = (before: number, expectedAfter: number): PendingUndo<Value> => ({
  taikoNo: TAIKO_NO,
  before: v(before),
  expectedAfter: v(expectedAfter),
  at: AT,
  purpose: "change",
});

const record = (before: number, after: number): UndoRecord<Value> => ({
  taikoNo: TAIKO_NO,
  before: v(before),
  after: v(after),
  at: AT,
  status: "current",
});

/** A slot holding an earlier change 0 → 1, and a pending write started from `pending`. */
const withPending = (pending: PendingUndo<Value>): UndoSlot<Value> =>
  beginPending({ record: record(0, 1), pending: null }, pending);

const applied = (before: number, after: number): WriteOutcome<Value> => ({
  kind: "applied",
  before: v(before),
  after: v(after),
  save: SAVE,
  cross: "off",
});

describe("settle", () => {
  test("a change read back as planned becomes the record, replacing the last one", () => {
    expect(settle(withPending(change(1, 2)), applied(1, 2), same)).toEqual({
      record: record(1, 2),
      pending: null,
    });
    expect(
      settle(
        withPending(change(1, 2)),
        { kind: "appliedNotSynced", before: v(1), after: v(2), save: SAVE, cross: "off" },
        same,
      ).record,
    ).toEqual(record(1, 2));
  });

  test("a change that went elsewhere becomes the record of where it really went", () => {
    const diverged: WriteOutcome<Value> = {
      kind: "diverged",
      before: v(1),
      expectedAfter: v(2),
      after: v(3),
      save: SAVE,
      cross: "off",
    };
    expect(settle(withPending(change(1, 2)), diverged, same).record).toEqual(record(1, 3));
  });

  test("a write that diverged back to where it began, as the page beside it moved, makes no record", () => {
    const diverged: WriteOutcome<Value> = {
      kind: "diverged",
      before: v(1),
      expectedAfter: v(2),
      after: v(1),
      save: SAVE,
      cross: "changed",
    };
    // The set is as the record left it: the record stays, and the pending write goes.
    expect(settle(withPending(change(1, 2)), diverged, same)).toEqual({
      record: record(0, 1),
      pending: null,
    });
    // An undo that did not move the set is no different.
    const undo: PendingUndo<Value> = { ...change(1, 0), purpose: "undo" };
    expect(settle(withPending(undo), diverged, same)).toEqual({
      record: record(0, 1),
      pending: null,
    });
    // A record the set has moved away from is marked stale, as any outcome that shows the set does.
    const older = beginPending({ record: record(0, 5), pending: null }, change(1, 2));
    expect(settle(older, diverged, same)).toEqual({
      record: { ...record(0, 5), status: "stale" },
      pending: null,
    });
  });

  test("an undo that landed spends the record", () => {
    const undo: PendingUndo<Value> = { ...change(1, 0), purpose: "undo" };
    expect(settle(withPending(undo), applied(1, 0), same)).toEqual({ record: null, pending: null });
  });

  test("an undo stopped because the set changed elsewhere leaves the record stale", () => {
    const undo: PendingUndo<Value> = { ...change(1, 0), purpose: "undo" };
    const settled = settle(withPending(undo), { kind: "changedSincePreview", current: v(5) }, same);
    expect(settled).toEqual({ record: { ...record(0, 1), status: "stale" }, pending: null });
  });

  test("a write that moved nothing drops the pending write and keeps the record", () => {
    const outcomes: WriteOutcome<Value>[] = [
      {
        kind: "notApplied",
        before: v(1),
        after: v(1),
        reason: { kind: "unchanged" },
        save: SAVE,
        cross: "off",
      },
      { kind: "needsConfirmation" },
      { kind: "stoppedBeforeWrite", reason: "precheckRejected", code: "" },
      { kind: "maintenance" },
      { kind: "invalidTarget", field: "n" },
      { kind: "sessionGone", writeMayHaveHappened: false },
    ];
    for (const outcome of outcomes) {
      expect(settle(withPending(change(1, 2)), outcome, same)).toEqual({
        record: record(0, 1),
        pending: null,
      });
    }
  });

  test("a write whose end is not known keeps its pending write", () => {
    const unknown: WriteOutcome<Value>[] = [
      {
        kind: "outcomeUnknown",
        before: v(1),
        expectedAfter: v(2),
        save: SAVE,
        failure: { kind: "timedOut" },
      },
      {
        kind: "sessionGone",
        writeMayHaveHappened: true,
        before: v(1),
        expectedAfter: v(2),
        save: SAVE,
      },
    ];
    for (const outcome of unknown) {
      const slot = withPending(change(1, 2));
      expect(settle(slot, outcome, same)).toBe(slot);
    }
  });

  test("with nothing pending, nothing changes", () => {
    const slot: UndoSlot<Value> = { record: record(0, 1), pending: null };
    expect(settle(slot, applied(1, 2), same)).toBe(slot);
  });
});

describe("reconcile", () => {
  test("a pending write found as planned lands", () => {
    expect(reconcile(withPending(change(1, 2)), v(2), same)).toEqual({
      record: record(1, 2),
      pending: null,
    });
  });

  test("a pending write found as it was goes, and the record stays", () => {
    expect(reconcile(withPending(change(1, 2)), v(1), same)).toEqual({
      record: record(0, 1),
      pending: null,
    });
  });

  test("a pending write found anywhere else goes, and the record is stale", () => {
    expect(reconcile(withPending(change(1, 2)), v(7), same)).toEqual({
      record: { ...record(0, 1), status: "stale" },
      pending: null,
    });
  });

  test("a record the set has moved away from is stale", () => {
    const slot: UndoSlot<Value> = { record: record(0, 1), pending: null };
    expect(reconcile(slot, v(1), same).record?.status).toBe("current");
    expect(reconcile(slot, v(4), same).record?.status).toBe("stale");
    expect(reconcile(EMPTY_UNDO_SLOT, v(4), same)).toEqual({ record: null, pending: null });
  });
});

describe("undoInput and offeredUndo", () => {
  test("an undo expects the record's after and writes back its before", () => {
    expect(undoInput(record(0, 1))).toEqual({ expected: v(1), target: v(0) });
  });

  test("an undo is offered only for a current record of the signed-in player", () => {
    const slot: UndoSlot<Value> = { record: record(0, 1), pending: null };
    expect(offeredUndo(slot, TAIKO_NO)).toEqual(record(0, 1));
    expect(offeredUndo(slot, "111111111111")).toBeNull();
    expect(offeredUndo(slot, null)).toBeNull();
    expect(
      offeredUndo({ record: { ...record(0, 1), status: "stale" }, pending: null }, TAIKO_NO),
    ).toBeNull();
  });
});
