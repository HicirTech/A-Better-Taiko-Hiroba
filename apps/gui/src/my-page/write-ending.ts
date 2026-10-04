import type { MessageKey } from "@abth/i18n";

import type { PictureLane } from "../pictures/picture-lane";
import type { WriteOutcomeView } from "../session-port";

/** The set as the write last saw it; null for an ending that says nothing of it. */
export function seenAfter<S>(outcome: WriteOutcomeView<S>): S | null {
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
    case "notApplied":
    case "diverged":
      return outcome.after;
    case "changedSincePreview":
      return outcome.current;
    default:
      return null;
  }
}

/** The editor with the set as the write last saw it; any other ending leaves it as it was. */
export function refreshed<S, E extends { readonly state: S }>(
  editor: E,
  outcome: WriteOutcomeView<S>,
): E {
  const seen = seenAfter(outcome);
  return seen === null ? editor : { ...editor, state: seen };
}

/** A write's ending a page says something about: every ending but a plain `applied`. */
export type Noticed<S> = Exclude<WriteOutcomeView<S>, { readonly kind: "applied" }>;

export function noticeOf<S>(outcome: WriteOutcomeView<S>): Noticed<S> | null {
  return outcome.kind === "applied" ? null : outcome;
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
