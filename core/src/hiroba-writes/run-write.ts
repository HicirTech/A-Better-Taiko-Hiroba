import { isErr, isOk, type Result } from "../operation-results";
import { postAjax, readPrecheck, readSaveCode, readSaveMessage } from "./ajax";
import { judge } from "./judge";
import { inMaintenance } from "./maintenance";
import { sessionEnded } from "./read-page";
import type {
  AjaxAnswer,
  CrossVerdict,
  EditorReading,
  HirobaReadFailure,
  PrecheckVerdict,
  SaveReading,
  StopReason,
  WriteDeps,
  WriteOutcome,
  WriteSpec,
} from "./types";

const STOP_REASON = {
  unexpected: "precheckUnexpected",
  rejected: "precheckRejected",
  endedAtLogin: "precheckAtLogin",
  endpointMissing: "precheckEndpointMissing",
  noAnswer: "precheckNoAnswer",
} as const satisfies Record<Exclude<PrecheckVerdict, "clear" | "needsConfirmation">, StopReason>;

/** Runs one write; the outcome comes from the read-back, not from what the site answered. */
export async function runWrite<S, T, B, E extends EditorReading<S>, C>(
  spec: WriteSpec<S, T, B, E, C>,
  input: { readonly expected: S; readonly target: T },
  deps: WriteDeps,
): Promise<WriteOutcome<S>> {
  if (inMaintenance(deps.now())) {
    return { kind: "maintenance" };
  }
  // The cross-check page is read before the editor: the editor's token must be the last one
  // issued before the posts, or Hiroba answers 705.
  const cross = deps.crossCheck ? spec.cross : undefined;
  const crossBefore = cross === undefined ? null : await cross.read(deps);
  if (crossBefore !== null && isErr(crossBefore)) {
    return beforeAnyPost(crossBefore.error);
  }
  const editor = await spec.readEditor(deps);
  if (isErr(editor)) {
    return beforeAnyPost(editor.error);
  }
  const before = editor.value.state;
  if (!spec.same(before, input.expected)) {
    return { kind: "changedSincePreview", current: before };
  }
  const body = spec.normalise(editor.value, input.target);
  if (isErr(body)) {
    return { kind: "invalidTarget", field: body.error.field };
  }
  const expectedAfter = spec.expectedAfter(before, body.value);
  if (spec.same(expectedAfter, before)) {
    return { kind: "nothingToChange" };
  }

  if (spec.precheck !== undefined) {
    // Checked again before each post: the reads before it can take their full timeout.
    if (inMaintenance(deps.now())) {
      return { kind: "maintenance" };
    }
    const answer = await postAjax(
      deps.transport,
      deps.hirobaOrigin,
      spec.precheck(editor.value, body.value),
    );
    const verdict = readPrecheck(answer);
    if (verdict === "needsConfirmation") {
      return { kind: "needsConfirmation" };
    }
    if (verdict !== "clear") {
      // A post that ended on the login page is only a signal; one GET decides the session.
      if (verdict === "endedAtLogin") {
        const probe = await spec.readBack(deps);
        if (isErr(probe) && sessionEnded(probe.error)) {
          return { kind: "sessionGone", writeMayHaveHappened: false };
        }
      }
      return { kind: "stoppedBeforeWrite", reason: STOP_REASON[verdict], code: answer.code };
    }
  }

  let saveFrom = editor.value;
  if (spec.stage !== undefined) {
    if (inMaintenance(deps.now())) {
      return { kind: "maintenance" };
    }
    const staged = await spec.stage(deps, editor.value, body.value);
    if (isErr(staged)) {
      return beforeAnyPost(staged.error);
    }
    if (!spec.same(staged.value.state, expectedAfter)) {
      return { kind: "notStaged", before, staged: staged.value.state, expectedAfter };
    }
    // The save carries the token of the page staging ended on, the last one issued.
    saveFrom = staged.value;
  }

  // The pre-check and staging save nothing, so a break that began after them stops the write.
  if (inMaintenance(deps.now())) {
    return { kind: "maintenance" };
  }
  const save = readSave(
    await postAjax(deps.transport, deps.hirobaOrigin, spec.save(saveFrom, body.value)),
  );
  // Sent once, never retried. Always read back: even a timed-out save may have been saved.
  const after = await spec.readBack(deps);
  let crossVerdict: CrossVerdict = "off";
  if (cross !== undefined && crossBefore !== null && isOk(after)) {
    const crossAfter: Result<C, HirobaReadFailure> = await cross.read(deps);
    crossVerdict = isErr(crossAfter)
      ? "unknown"
      : cross.same(crossBefore.value, crossAfter.value)
        ? "unchanged"
        : "changed";
  }
  return judge(spec, { before, expectedAfter, after, save, cross: crossVerdict });
}

function beforeAnyPost<S>(failure: HirobaReadFailure): WriteOutcome<S> {
  return sessionEnded(failure)
    ? { kind: "sessionGone", writeMayHaveHappened: false }
    : { kind: "readFailed", failure };
}

function readSave(answer: AjaxAnswer): SaveReading {
  return {
    answer: answer.kind,
    code: answer.kind === "json" ? readSaveCode(answer.value) : null,
    message: answer.kind === "json" ? readSaveMessage(answer.value) : null,
    report: answer.code,
  };
}
