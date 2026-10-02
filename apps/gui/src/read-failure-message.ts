import type { MessageKey } from "@abth/i18n";

import type { ReadFailureKind } from "./session-port";

/** What each way a read can fail says: one `failure.*` key per kind, and a new kind unworded fails. */
export const FAILURE_MESSAGE = {
  notSignedIn: "failure.notSignedIn",
  loggedOut: "failure.loggedOut",
  cardSelectUnfinished: "failure.cardSelectUnfinished",
  unreachable: "failure.unreachable",
  timedOut: "failure.timedOut",
  cancelled: "failure.cancelled",
  siteError: "failure.siteError",
  unexpectedPage: "failure.unexpectedPage",
} as const satisfies Record<ReadFailureKind, MessageKey>;

/** Failures after which the platform has already dropped the session: back to signing in. */
export const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);
