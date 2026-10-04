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
  | { readonly kind: "noSession" }
  | { readonly kind: "refused"; readonly host: string };

export interface SignInAttempt {
  readonly result: Promise<SignInResult>;
  /** Closes the window; `result` then settles as cancelled unless it already landed. */
  cancel(): void;
}

/** Opens Hiroba's sign-in in a window on an in-memory partition, new for every attempt, so nothing
 * it sets reaches the disk or the next attempt. It may only navigate between the two sites. */
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

  // A refused navigation ends the attempt and names the host: refusing it quietly left the window
  // on its page, which looked like a button that does nothing.
  const refuse = (event: { preventDefault(): void }, url: string) => {
    event.preventDefault();
    settle({ kind: "refused", host: hostOf(url) });
    window.close();
  };
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event) => {
    if (signInStep(event.url, endpoints) === "elsewhere") {
      refuse(event, event.url);
    }
  });
  contents.on("will-redirect", (event) => {
    if (event.isMainFrame && signInStep(event.url, endpoints) === "elsewhere") {
      refuse(event, event.url);
    }
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

/** The host only: a sign-in URL's path and query carry OAuth state that must not reach the UI. */
function hostOf(url: string): string {
  try {
    return new URL(url).host || "?";
  } catch {
    return "?";
  }
}

// Electron cannot destroy a Session, so its contents are cleared instead.
async function forget(signInSession: Session): Promise<void> {
  await Promise.all([
    signInSession.clearStorageData(),
    signInSession.clearCache(),
    signInSession.clearAuthCache(),
  ]);
}
