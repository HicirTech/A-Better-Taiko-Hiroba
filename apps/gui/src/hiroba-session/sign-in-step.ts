import type { HirobaEndpoints, SignInStep } from "./types";

const HIROBA_LOGIN_PATHS: ReadonlySet<string> = new Set(["/login.php", "/login_process.php"]);
const CARD_SELECT_PATH = "/login_select.php";
/**
 * An allow-list, not "anything that is not a login page": the in-app browser on Android reports
 * every redirect hop, and the Hiroba callback hop, whose name is unknown, must not count as done.
 */
const LANDING_PATHS: ReadonlySet<string> = new Set(["/index.php"]);

/**
 * Classifies a URL by parsed host and path. The whole URL is never searched for a host name: the
 * OAuth round trip carries `donderhiroba.jp` in its own query string.
 */
export function signInStep(rawUrl: string | undefined, endpoints: HirobaEndpoints): SignInStep {
  let url: URL;
  try {
    url = new URL(rawUrl ?? "");
  } catch {
    return "elsewhere";
  }
  if (url.host === endpoints.idpHost) {
    return "idp";
  }
  if (url.host !== new URL(endpoints.hirobaOrigin).host) {
    return "elsewhere";
  }
  if (HIROBA_LOGIN_PATHS.has(url.pathname)) {
    return "hirobaLogin";
  }
  if (url.pathname === CARD_SELECT_PATH) {
    return "cardSelect";
  }
  return LANDING_PATHS.has(url.pathname) ? "landed" : "otherHiroba";
}
