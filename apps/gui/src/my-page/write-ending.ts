import type { MessageKey } from "@abth/i18n";

import type { PictureLane } from "../pictures/picture-lane";
import type { WriteOutcomeView } from "../session-port";

/**
 * An editor after a write, with the set as the write last saw it: the set read back for a write
 * that went through or did not, and the set it found for one stopped because the set had moved.
 * Every other ending leaves the editor as it was.
 */
export function refreshed<S, E extends { readonly state: S }>(
  editor: E,
  outcome: WriteOutcomeView<S>,
): E {
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
    case "notApplied":
    case "diverged":
      return { ...editor, state: outcome.after };
    case "changedSincePreview":
      return { ...editor, state: outcome.current };
    default:
      return editor;
  }
}

/**
 * Sends one write, a save or an undo, with no picture asked for meanwhile: the lane is held for it,
 * so not even a thumbnail queues behind it. A call that fails itself, as a bridge that refused it
 * does, ends as `interrupted`: how the write ended is not known, and the page must not stay on
 * "Saving…" with nothing to press.
 */
export async function sendHeld<S>(
  lane: Pick<PictureLane, "hold" | "release">,
  send: () => Promise<WriteOutcomeView<S>>,
): Promise<WriteOutcomeView<S>> {
  lane.hold();
  try {
    return await send();
  } catch {
    return { kind: "interrupted" };
  } finally {
    lane.release();
  }
}

/**
 * What the window says on the sign-in card for a write that found the session gone, or null for
 * any other ending: the platform has dropped the session, and the window goes back to signing in.
 */
export function sessionNoticeOf(outcome: WriteOutcomeView<unknown>): MessageKey | null {
  switch (outcome.kind) {
    case "notSignedIn":
      return "failure.notSignedIn";
    case "sessionGone":
      return outcome.writeMayHaveHappened ? "write.sessionGoneAfterSave" : "write.sessionGone";
    default:
      return null;
  }
}
