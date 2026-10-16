import { randomUUID } from "node:crypto";
import { BrowserWindow, type Session, session, shell } from "electron";

import {
  type HirobaEndpoints,
  loginPageUrl,
  SESSION_COOKIE_NAME,
  signInHost,
  signInStep,
  systemBrowserEntryUrl,
} from "../src/hiroba-session";
import { OFF_SCREEN_OPTIONS, showOffScreen } from "./off-screen";

export type SignInResult =
  | { readonly kind: "captured"; readonly cookie: string }
  | { readonly kind: "cancelled" }
  | { readonly kind: "noSession" }
  | { readonly kind: "refused"; readonly host: string }
  | { readonly kind: "refuser"; readonly host: string };

export interface SignInAttempt {
  readonly result: Promise<SignInResult>;
  /** Closes the window; `result` then settles as cancelled unless it already landed. */
  cancel(): void;
}

type Ending = "refused" | "refuser";

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 680;

/** Opens Hiroba's sign-in on an in-memory partition new for each attempt, which nothing outlives. */
export function openSignInWindow(
  parent: BrowserWindow,
  endpoints: HirobaEndpoints,
  userAgent: string,
  offScreen: boolean,
): SignInAttempt {
  const partition = `abth-sign-in-${randomUUID()}`;
  const signInSession = session.fromPartition(partition, { cache: false });
  signInSession.setUserAgent(userAgent);
  signInSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  signInSession.setPermissionCheckHandler(() => false);
  const webPreferences = {
    partition,
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
  };

  const window = new BrowserWindow({
    parent,
    width: 480,
    height: 760,
    autoHideMenuBar: true,
    ...(offScreen ? OFF_SCREEN_OPTIONS : {}),
    webPreferences,
  });
  if (offScreen) {
    showOffScreen(window);
  }
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

  // An ended navigation closes the window and names the host: refusing it quietly left the window
  // on its page, which looked like a button that does nothing.
  const end = (kind: Ending, url: string) => {
    settle({ kind, host: signInHost(url) });
    if (kind === "refuser") {
      openEntryInSystemBrowser(endpoints);
    }
    window.close();
  };
  const ending = (url: string): Ending | null => {
    const step = signInStep(url, endpoints);
    return step === "elsewhere" ? "refused" : step === "refuser" ? "refuser" : null;
  };
  // The sign-in's own window and each popup its pages open keep to one rule, on one session.
  const guard = (shown: BrowserWindow, firstUrl: string) => {
    const guarded = shown.webContents;
    // The title is the host, so the player sees where a password goes.
    shown.setTitle(signInHost(firstUrl));
    shown.on("page-title-updated", (event) => event.preventDefault());
    guarded.on("did-navigate", (_event, url) => shown.setTitle(signInHost(url)));
    guarded.on("will-navigate", (event) => {
      const kind = ending(event.url);
      if (kind !== null) {
        event.preventDefault();
        end(kind, event.url);
      }
    });
    guarded.on("will-redirect", (event) => {
      const kind = event.isMainFrame ? ending(event.url) : null;
      if (kind !== null) {
        event.preventDefault();
        end(kind, event.url);
      }
    });
    guarded.setWindowOpenHandler(({ url }) => {
      // Some sign-in scripts open a popup blank and send it on: its navigations are guarded.
      const kind = url === "about:blank" ? null : ending(url);
      if (kind !== null) {
        end(kind, url);
        return { action: "deny" };
      }
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          parent: window,
          width: POPUP_WIDTH,
          height: POPUP_HEIGHT,
          autoHideMenuBar: true,
          ...(offScreen ? OFF_SCREEN_OPTIONS : {}),
          webPreferences,
        },
      };
    });
    guarded.on("did-create-window", (popup, details) => {
      if (offScreen) {
        showOffScreen(popup);
      }
      guard(popup, details.url);
    });
  };
  guard(window, loginPageUrl(endpoints));

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

// The service's own URL never leaves the app: it carries OAuth state. The system's browser starts
// the sign-in over from the fixed login page.
function openEntryInSystemBrowser(endpoints: HirobaEndpoints): void {
  const entry = systemBrowserEntryUrl(endpoints);
  if (entry === null) {
    return;
  }
  shell.openExternal(entry).catch((error: unknown) => {
    process.stderr.write(`The system's browser did not open ${entry}: ${String(error)}\n`);
  });
}

// Electron cannot destroy a Session, so its contents are cleared instead.
async function forget(signInSession: Session): Promise<void> {
  await Promise.all([
    signInSession.clearStorageData(),
    signInSession.clearCache(),
    signInSession.clearAuthCache(),
  ]);
}
