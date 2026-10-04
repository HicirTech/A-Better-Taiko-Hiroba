import { isErr, type Result } from "../operation-results";
import { sessionEnded } from "./read-page";
import type {
  CrossVerdict,
  HirobaReadFailure,
  SaveCodes,
  SaveReading,
  WriteOutcome,
} from "./types";

export interface Judged<S> {
  readonly before: S;
  readonly expectedAfter: S;
  readonly after: Result<S, HirobaReadFailure>;
  readonly save: SaveReading;
  readonly cross: CrossVerdict;
}

/** Judges by the state, not the code: Hiroba answers 0 (success) to saves that moved nothing. */
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
