import { parseRefreshToken } from "../hiroba-dom-parser";
import { err, isErr, ok, type Result } from "../operation-results";
import { postAjax, readSaveCode } from "./ajax";
import { inMaintenance } from "./maintenance";
import { MY_PAGE_PATH } from "./my-page";
import { readHirobaPage, sessionEnded } from "./read-page";
import type { HirobaReadFailure, ReadDeps } from "./types";

/** What the site's ↻ posts to: Hiroba then copies the player's data from the game server. */
const REFRESH_PATH = "ajax/update_score.php";
/** The one result the site's script takes as refreshed. */
const REFRESHED = 0;

/** Why Hiroba's copy was not refreshed. `detail` holds codes for a report, never the answer. */
export type RefreshFailure =
  | HirobaReadFailure
  | { readonly kind: "maintenance" }
  | { readonly kind: "notRefreshed"; readonly detail: string };

export interface RefreshDeps extends ReadDeps {
  readonly now: () => Date;
}

/** Hiroba's own ↻, once: my page for a fresh token, then the post. Never retried. */
export async function refreshHiroba(deps: RefreshDeps): Promise<Result<void, RefreshFailure>> {
  if (inMaintenance(deps.now())) {
    return err({ kind: "maintenance" });
  }
  // The post needs the last token Hiroba issued, so my page is read right before it.
  const token = await readHirobaPage(deps, MY_PAGE_PATH, parseRefreshToken);
  if (isErr(token)) {
    return token;
  }
  const answer = await postAjax(deps.transport, deps.hirobaOrigin, {
    path: REFRESH_PATH,
    referer: MY_PAGE_PATH,
    form: [["_tckt", token.value]],
  });
  if (answer.kind === "json") {
    const result = readSaveCode(answer.value);
    return result === REFRESHED
      ? ok(undefined)
      : err({ kind: "notRefreshed", detail: `result=${result ?? "none"} ${answer.code}` });
  }
  if (answer.kind === "endedAtLogin") {
    // A post that ended on the login page is only a signal; one GET decides the session.
    const probe = await readHirobaPage(deps, MY_PAGE_PATH, parseRefreshToken);
    if (isErr(probe) && sessionEnded(probe.error)) {
      return probe;
    }
  }
  return err({ kind: "notRefreshed", detail: answer.code });
}
