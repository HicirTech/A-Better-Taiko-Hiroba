import { inMaintenance } from "@abth/core";
import type { MessageKey } from "@abth/i18n";

import type { ReadFailureKind } from "./session-port";

export const FAILURE_MESSAGE = {
  notSignedIn: "failure.notSignedIn",
  loggedOut: "failure.loggedOut",
  cardSelectUnfinished: "failure.cardSelectUnfinished",
  unreachable: "failure.unreachable",
  timedOut: "failure.timedOut",
  cancelled: "failure.cancelled",
  siteError: "failure.siteError",
  unexpectedPage: "failure.unexpectedPage",
  maintenance: "failure.maintenance",
  notRefreshed: "failure.notRefreshed",
} as const satisfies Record<ReadFailureKind, MessageKey>;

/** The words for a failed read; in Hiroba's daily maintenance hours its error says so. */
export function failureMessageOf(kind: ReadFailureKind, at: Date): MessageKey {
  return kind === "siteError" && inMaintenance(at)
    ? "failure.siteErrorInMaintenance"
    : FAILURE_MESSAGE[kind];
}

/** Failures after which the platform has already dropped the session: back to signing in. */
export const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);

/** A read of Hiroba's options: a failure that ended the session sends the window to sign in. */
export function hirobaSession(onSessionGone: (notice: MessageKey) => void) {
  return {
    endsTheSession: (failure: { readonly kind: ReadFailureKind }) => SESSION_GONE.has(failure.kind),
    onSessionEnded: (failure: { readonly kind: ReadFailureKind }) =>
      onSessionGone(FAILURE_MESSAGE[failure.kind]),
  };
}
