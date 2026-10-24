import type { Screen } from "../pages/page-model";

/** Whether a page waits for its reads, and whether it stays on screen, shut, meanwhile. */
export interface PageWaiting {
  readonly waits: boolean;
  readonly holds: boolean;
}

/** A page waits for my page, its first read or a read of its own; read again, it stays, shut. */
export function pageWaiting(
  screen: Screen["name"],
  standsAlone: boolean,
  firstRead: boolean,
  reading: boolean,
): PageWaiting {
  if (standsAlone) {
    return { waits: false, holds: false };
  }
  const profile = screen === "profile";
  return {
    waits: screen === "checking" || screen === "reading" || (profile && (firstRead || reading)),
    holds: profile && !firstRead,
  };
}
