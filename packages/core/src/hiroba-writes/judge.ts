import { isErr, type Result } from "../operation-results";
import { sessionEnded } from "./read-page";
import type {
  CrossVerdict,
  HirobaReadFailure,
  SaveCodes,
  SaveReading,
  WriteOutcome,
} from "./types";

/** Everything a write knows once its save is sent and the set read back. */
export interface Judged<S> {
  readonly before: S;
  readonly expectedAfter: S;
  readonly after: Result<S, HirobaReadFailure>;
  readonly save: SaveReading;
  readonly cross: CrossVerdict;
}

/**
 * The verdict on a sent save, by the state first and the site's code second. Hiroba answers 0,
 * success, to saves that moved nothing (the costume set rule, the settings pairs, the unstaged
 * favourite folder), so the code never decides alone:
 *
 * 1. no read-back: the session ended, or the outcome is unknown;
 * 2. the set is where the write meant it to be: applied, unless the cross-checked page moved, or
 *    the endpoint's "saved but not synced" code came with it;
 * 3. the set is where it was: not applied, and the code, read by the endpoint's own table, says
 *    why; unless the cross-checked page moved;
 * 4. anywhere else: diverged.
 */
export function judge<S>(
  spec: { readonly same: (left: S, right: S) => boolean; readonly codes: SaveCodes },
  { before, expectedAfter, after, save, cross }: Judged<S>,
): WriteOutcome<S> {
  if (isErr(after)) {
    return sessionEnded(after.error)
      ? { kind: "sessionGone", writeMayHaveHappened: true, before, expectedAfter, save }
      : { kind: "outcomeUnknown", before, expectedAfter, save, failure: after.error };
  }
  const now = after.value;
  const diverged = { kind: "diverged", before, expectedAfter, after: now, save, cross } as const;
  if (spec.same(now, expectedAfter)) {
    if (cross === "changed") {
      return diverged;
    }
    const notSynced = spec.codes.notSynced;
    return notSynced !== undefined && save.code === notSynced
      ? { kind: "appliedNotSynced", before, after: now, save, cross }
      : { kind: "applied", before, after: now, save, cross };
  }
  if (spec.same(now, before)) {
    return cross === "changed"
      ? diverged
      : { kind: "notApplied", before, after: now, reason: spec.codes.reason(save), save, cross };
  }
  return diverged;
}
