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

/** Failures after which the platform has already dropped the session: back to signing in. */
export const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);
