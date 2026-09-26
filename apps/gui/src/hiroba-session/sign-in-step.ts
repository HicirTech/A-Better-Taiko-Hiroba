import { idpOrigin } from "./endpoints";
import type { HirobaEndpoints, SignInStep } from "./types";

const HIROBA_LOGIN_PATHS: ReadonlySet<string> = new Set(["/login.php", "/login_process.php"]);
const CARD_SELECT_PATH = "/login_select.php";
/**
 * An allow-list, not "anything that is not a login page": the in-app browser on Android reports
 * every redirect hop, and the Hiroba callback hop, whose name is unknown, must not count as done.
 */
const LANDING_PATHS: ReadonlySet<string> = new Set(["/index.php"]);

/**
 * Classifies a URL by parsed origin and path. The whole URL is never searched for a host name: the
 * OAuth round trip carries `donderhiroba.jp` in its own query string.
 *
 * Origins, not hosts, are compared, so either host on another scheme is elsewhere: the desktop
 * sign-in window has no address bar, and a plain-http page there would look like the real form.
 * Endpoints that do not parse make every URL elsewhere, so a bad override fails closed.
 */
export function signInStep(rawUrl: string | undefined, endpoints: HirobaEndpoints): SignInStep {
  let url: URL;
  let hiroba: string;
  let idp: string;
  try {
    url = new URL(rawUrl ?? "");
    hiroba = new URL(endpoints.hirobaOrigin).origin;
    idp = new URL(idpOrigin(endpoints)).origin;
  } catch {
    return "elsewhere";
  }
  if (url.origin === idp) {
    return "idp";
  }
  if (url.origin !== hiroba) {
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
