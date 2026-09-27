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

/** Each way a pre-check can fail to clear a write, as the reason the write stopped. */
const STOP_REASON = {
  unexpected: "precheckUnexpected",
  rejected: "precheckRejected",
  endedAtLogin: "precheckAtLogin",
  endpointMissing: "precheckEndpointMissing",
  noAnswer: "precheckNoAnswer",
} as const satisfies Record<Exclude<PrecheckVerdict, "clear" | "needsConfirmation">, StopReason>;

/**
 * Runs one write the one way every write goes:
 *
 * 1. GET the editor, for a fresh token and the whole set as it is now;
 * 2. check the set is still the one the change was made against, and turn the target into a body
 *    the server will not silently ignore, or refuse it;
 * 3. keep a pending undo record;
 * 4. the pre-check post, where the endpoint has one, which goes on only on the boolean false;
 * 5. the save post, sent exactly once, whatever happens to it;
 * 6. read the whole set back, and judge by what it shows rather than by what the site said.
 *
 * With `crossCheck`, another page is read first — before the editor — and again after the
 * read-back, to see it did not move. First, and not between the editor and the posts: the editor's
 * token has to be the last one the site issued before the posts. On 2026-09-28 a real costume save
 * whose token came from the editor, with my page read in between, answered 705 (更新に失敗しました。
 * 再度画面の読み込みを行ってください。) and changed nothing, although its pre-check had answered false.
 * The likely reading is that rendering a page with a form re-issues the session's token and voids
 * the one before; that is not settled, and this order holds either way.
 * Nothing is retried and nothing loops: every request above is sent at most once,
 * except the read-back, which is also the one GET that settles whether a pre-check that ended on
 * the login page ended the session.
 *
 * No post goes out between 05:00 and 07:00 JST. The clock is looked at before the first request
 * and again just before each post, since the reads before a post can take their full timeout: a
 * write started at 04:59 stops at 05:00 rather than posting into the break.
 */
export async function runWrite<S, T, B, E extends EditorReading<S>, C>(
  spec: WriteSpec<S, T, B, E, C>,
  input: { readonly expected: S; readonly target: T },
  deps: WriteDeps<S>,
): Promise<WriteOutcome<S>> {
  if (inMaintenance(deps.now())) {
    return { kind: "maintenance" };
  }
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
  try {
    await deps.beginUndo(before, expectedAfter);
  } catch {
    return { kind: "undoNotSaved" };
  }

  if (spec.precheck !== undefined) {
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

  // A pre-check changes nothing, so a break that began after it still leaves nothing saved.
  if (inMaintenance(deps.now())) {
    return { kind: "maintenance" };
  }
  const save = readSave(
    await postAjax(deps.transport, deps.hirobaOrigin, spec.save(editor.value, body.value)),
  );
  // Always read back, a save that timed out included: it may have been saved all the same.
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

/** A read before any post failed: a session that is over, or a read that did not arrive. */
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
