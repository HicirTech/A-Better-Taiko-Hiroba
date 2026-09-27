import type { WriteOutcome } from "./types";

/**
 * What undoes the last write of one kind: the set before it, which the undo writes back, and the
 * set it was read back as, which the undo expects to find. An undo is an ordinary write with
 * `expected` = `after`, so a set changed anywhere else since — on the site, or from another device
 * — stops it rather than being overwritten.
 *
 * `taikoNo` is whose set it is: an undo is offered only while the signed-in player is that one.
 * A `stale` record is one the set has moved away from; it is kept only to say so.
 */
export interface UndoRecord<S> {
  readonly taikoNo: string;
  readonly before: S;
  readonly after: S;
  /** ISO 8601, when the write was started. */
  readonly at: string;
  readonly status: "current" | "stale";
}

/**
 * Kept before a write's first post, so a write whose end is not known — the read-back did not
 * arrive, or the session ended after the save — can be settled later from what the editor shows.
 * `purpose` is what landing it means: a change leaves a new record, an undo spends the old one.
 */
export interface PendingUndo<S> {
  readonly taikoNo: string;
  readonly before: S;
  readonly expectedAfter: S;
  readonly at: string;
  readonly purpose: "change" | "undo";
}

/** One kind of write's undo state: the record, and a write that has started and not settled. */
export interface UndoSlot<S> {
  readonly record: UndoRecord<S> | null;
  readonly pending: PendingUndo<S> | null;
}

export const EMPTY_UNDO_SLOT: UndoSlot<never> = { record: null, pending: null };

type Same<S> = (left: S, right: S) => boolean;

/** The slot with `pending` kept: written before the first post. */
export function beginPending<S>(slot: UndoSlot<S>, pending: PendingUndo<S>): UndoSlot<S> {
  return { ...slot, pending };
}

/**
 * The slot after a write ended, by how it ended:
 *
 * - read back as planned: a change becomes the record, and an undo spends it;
 * - the set moved elsewhere than planned: a change becomes the record, of where it really went;
 *   an undo leaves the old record stale;
 * - the save was sent and the end is unknown: the pending write stays, for `reconcile`;
 * - anything else, nothing moved: the pending write goes and the record stays.
 *
 * Wherever the outcome shows the set as it is now, a record whose `after` it no longer matches is
 * marked stale.
 */
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

/**
 * The slot once the set is known again, from an editor read that asks Hiroba nothing more. A
 * pending write settles: found as planned, it lands; found as it was, it goes; found anywhere else,
 * it goes and the record is stale. Then a record whose `after` is not the set is stale.
 */
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

/** The write that undoes a record: from its `after`, back to its `before`. */
export function undoInput<S>(record: UndoRecord<S>): { readonly expected: S; readonly target: S } {
  return { expected: record.after, target: record.before };
}

/** The record an undo can be offered for: current, and the signed-in player's own. */
export function offeredUndo<S>(slot: UndoSlot<S>, taikoNo: string | null): UndoRecord<S> | null {
  const { record } = slot;
  return record !== null && record.status === "current" && record.taikoNo === taikoNo
    ? record
    : null;
}

/** What a pending write that landed leaves: a new record for a change; none for an undo. */
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
