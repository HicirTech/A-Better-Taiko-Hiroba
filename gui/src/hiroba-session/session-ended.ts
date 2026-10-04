import type { ReadFailure } from "../session-port";

/** A read that found the login page, or a card still to choose: the session is over. */
export function sessionEnded(failure: ReadFailure): boolean {
  return failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";
}
