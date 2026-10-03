import type { MessageKey } from "@abth/i18n";

import type { PictureLane } from "../pictures/picture-lane";
import type { WriteOutcomeView } from "../session-port";

/** The editor with the set as the write last saw it; any other ending leaves it as it was. */
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

export async function sendHeld<S>(
  lane: Pick<PictureLane, "hold" | "release">,
  send: () => Promise<WriteOutcomeView<S>>,
): Promise<WriteOutcomeView<S>> {
  lane.hold();
  try {
    return await send();
  } catch {
    // The call itself failed (a bridge refused it): the page must not stay on "Saving…".
    return { kind: "interrupted" };
  } finally {
    lane.release();
  }
}

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
