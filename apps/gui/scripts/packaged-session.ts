import { existsSync } from "node:fs";
import { join } from "node:path";

/** The name Electron keeps a packaged build's data under, in %APPDATA%. */
const PRODUCT_NAME = "A Better Taiko Hiroba";

/** Why a script must not start the packaged app, or null: a kept session would reach Hiroba. */
export function refusalToStart(appData: string | undefined): string | null {
  if (appData === undefined || appData === "") {
    return "APPDATA is not set, so whether the packaged app keeps a session cannot be checked.";
  }
  const session = join(appData, PRODUCT_NAME, "session.json");
  return existsSync(session)
    ? `The packaged app keeps a session in ${session}; started, it would read the real Hiroba by itself. Sign out in the app first.`
    : null;
}
