import { randomUUID } from "node:crypto";
import { BrowserWindow, type Session, session } from "electron";

import {
  type HirobaEndpoints,
  loginPageUrl,
  SESSION_COOKIE_NAME,
  signInStep,
} from "../src/hiroba-session";

export type SignInResult =
  | { readonly kind: "captured"; readonly cookie: string }
  | { readonly kind: "cancelled" }
  | { readonly kind: "noSession" };

export interface SignInAttempt {
  readonly result: Promise<SignInResult>;
  /** Closes the window; `result` then settles as cancelled unless it already landed. */
  cancel(): void;
}

/**
 * Opens Hiroba's own sign-in in a window of its own, on a session that lives only in memory.
 *
 * The partition name has no `persist:` prefix and is new for every attempt, so nothing the sign-in
 * sets reaches the disk and no attempt inherits another's cookies. The window has no preload and
 * may only navigate between Hiroba's origin and the Bandai Namco ID host on the same scheme; it has
 * no address bar, so a plain-http page on either host is refused rather than shown. When the main
 * frame finishes loading index.php, the session cookie is read from that partition, handed back,
 * and the window closes; closing clears the partition either way.
 */
export function openSignInWindow(
  parent: BrowserWindow,
  endpoints: HirobaEndpoints,
  userAgent: string,
): SignInAttempt {
  const partition = `abth-sign-in-${randomUUID()}`;
  const signInSession = session.fromPartition(partition, { cache: false });
  signInSession.setUserAgent(userAgent);
  signInSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  signInSession.setPermissionCheckHandler(() => false);

  const window = new BrowserWindow({
    parent,
    width: 480,
    height: 760,
    autoHideMenuBar: true,
    webPreferences: { partition, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const contents = window.webContents;
  const allowed = (url: string) => signInStep(url, endpoints) !== "elsewhere";
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event) => {
    if (!allowed(event.url)) {
      event.preventDefault();
    }
  });
  contents.on("will-redirect", (event) => {
    if (event.isMainFrame && !allowed(event.url)) {
      event.preventDefault();
    }
  });

  let settle: (result: SignInResult) => void = () => undefined;
  const result = new Promise<SignInResult>((resolve) => {
    let settled = false;
    settle = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
  });

  contents.on("did-finish-load", async () => {
    if (signInStep(contents.getURL(), endpoints) !== "landed") {
      return;
    }
    const [cookie] = await signInSession.cookies.get({
      url: `${endpoints.hirobaOrigin}/`,
      name: SESSION_COOKIE_NAME,
    });
    settle(
      cookie === undefined ? { kind: "noSession" } : { kind: "captured", cookie: cookie.value },
    );
    window.close();
  });
  window.on("closed", () => {
    void forget(signInSession);
    settle({ kind: "cancelled" });
  });

  void window.loadURL(loginPageUrl(endpoints));
  return {
    result,
    cancel: () => {
      if (!window.isDestroyed()) {
        window.close();
      }
    },
  };
}

/**
 * Electron cannot destroy a Session, so its contents are cleared instead; the next attempt gets a
 * fresh partition anyway.
 */
async function forget(signInSession: Session): Promise<void> {
  await Promise.all([
    signInSession.clearStorageData(),
    signInSession.clearCache(),
    signInSession.clearAuthCache(),
  ]);
}
