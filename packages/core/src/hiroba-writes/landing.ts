/** The pages a lost session is answered with. */
const LOGIN_PATHS: ReadonlySet<string> = new Set(["/login.php", "/login_process.php"]);
/** A card still to be chosen: the session is not a player's yet. */
const CARD_SELECT_PATH = "/login_select.php";

/** Where an answer ended, judged by parsed origin and path, never by searching the URL. */
export type Landing = "login" | "cardSelect" | "hiroba" | "elsewhere";

export function landingOf(url: string, hirobaOrigin: string): Landing {
  let parsed: URL;
  let origin: string;
  try {
    parsed = new URL(url);
    origin = new URL(hirobaOrigin).origin;
  } catch {
    return "elsewhere";
  }
  if (parsed.origin !== origin) {
    return "elsewhere";
  }
  if (LOGIN_PATHS.has(parsed.pathname)) {
    return "login";
  }
  return parsed.pathname === CARD_SELECT_PATH ? "cardSelect" : "hiroba";
}

/** The final path, for a report; "?" when the URL does not parse. */
export function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
}
