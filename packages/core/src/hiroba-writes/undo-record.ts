import type { WriteOutcome } from "./types";

/** The undo of the last write: an ordinary write from `after` to `before`; a moved set stops it. */
export interface UndoRecord<S> {
  /** Whose set it is: an undo is offered only while that player is signed in. */
  readonly taikoNo: string;
  readonly before: S;
  readonly after: S;
  /** ISO 8601, when the write was started. */
  readonly at: string;
  /** `stale` is a record the set has moved away from, kept only to say so. */
  readonly status: "current" | "stale";
}

/** Kept before a write's first post, so a write with an unknown end can be settled later. */
export interface PendingUndo<S> {
  readonly taikoNo: string;
  readonly before: S;
  readonly expectedAfter: S;
  readonly at: string;
  /** What landing means: a change leaves a new record, an undo spends the old one. */
  readonly purpose: "change" | "undo";
}

export interface UndoSlot<S> {
  readonly record: UndoRecord<S> | null;
  readonly pending: PendingUndo<S> | null;
}

export const EMPTY_UNDO_SLOT: UndoSlot<never> = { record: null, pending: null };

type Same<S> = (left: S, right: S) => boolean;

export function beginPending<S>(slot: UndoSlot<S>, pending: PendingUndo<S>): UndoSlot<S> {
  return { ...slot, pending };
}

/** The slot after a write ended, by how it ended; a record the set moved away from goes stale. */
export function settle<S>(slot: UndoSlot<S>, outcome: WriteOutcome<S>, same: Same<S>): UndoSlot<S> {
  const { pending } = slot;
  if (pending === null) {
    return slot;
  }
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
      return { record: landed(pending, outcome.after), pending: null };
    case "diverged":
      if (same(outcome.after, outcome.before)) {
        return { record: staleUnless(slot.record, outcome.after, same), pending: null };
      }
      return pending.purpose === "change"
        ? { record: landed(pending, outcome.after), pending: null }
        : { record: markStale(slot.record), pending: null };
    case "outcomeUnknown":
      return slot;
    case "sessionGone":
      return outcome.writeMayHaveHappened ? slot : { record: slot.record, pending: null };
    case "notApplied":
      return { record: staleUnless(slot.record, outcome.after, same), pending: null };
    case "changedSincePreview":
      return { record: staleUnless(slot.record, outcome.current, same), pending: null };
    default:
      return { record: slot.record, pending: null };
  }
}

/** Settles a pending write and stales a mismatched record from a fresh editor read. */
export function reconcile<S>(slot: UndoSlot<S>, current: S, same: Same<S>): UndoSlot<S> {
  const { pending } = slot;
  if (pending === null) {
    return { record: staleUnless(slot.record, current, same), pending: null };
  }
  if (same(current, pending.expectedAfter)) {
    return { record: landed(pending, current), pending: null };
  }
  if (same(current, pending.before)) {
    return { record: staleUnless(slot.record, current, same), pending: null };
  }
  return { record: markStale(slot.record), pending: null };
}

export function undoInput<S>(record: UndoRecord<S>): { readonly expected: S; readonly target: S } {
  return { expected: record.after, target: record.before };
}

export function offeredUndo<S>(slot: UndoSlot<S>, taikoNo: string | null): UndoRecord<S> | null {
  const { record } = slot;
  return record !== null && record.status === "current" && record.taikoNo === taikoNo
    ? record
    : null;
}

function landed<S>(pending: PendingUndo<S>, after: S): UndoRecord<S> | null {
  return pending.purpose === "undo"
    ? null
    : {
        taikoNo: pending.taikoNo,
        before: pending.before,
        after,
        at: pending.at,
        status: "current",
      };
}

function staleUnless<S>(
  record: UndoRecord<S> | null,
  current: S,
  same: Same<S>,
): UndoRecord<S> | null {
  return record !== null && !same(record.after, current) ? markStale(record) : record;
}

function markStale<S>(record: UndoRecord<S> | null): UndoRecord<S> | null {
  return record === null ? null : { ...record, status: "stale" };
}
