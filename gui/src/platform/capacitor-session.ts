import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultiOSWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  type HirobaEndpoints,
  idpOrigin,
  loginPageUrl,
  signInHost,
  signInStep,
  systemBrowserEntryUrl,
} from "../hiroba-session";
import type { SignInOutcome } from "../shared/session-port";
import type { MobileOs } from "./system-os";

export interface SignedInFlag {
  get(): boolean;
  set(value: boolean): void;
}

const SIGNED_IN_KEY = "abth.signedIn";

export const localStorageFlag: SignedInFlag = {
  get: () => {
    try {
      return globalThis.localStorage?.getItem(SIGNED_IN_KEY) === "1";
    } catch {
      return false;
    }
  },
  set: (value) => {
    try {
      if (value) {
        globalThis.localStorage?.setItem(SIGNED_IN_KEY, "1");
      } else {
        globalThis.localStorage?.removeItem(SIGNED_IN_KEY);
      }
    } catch {
      // Storage refused: the next launch asks for a sign-in, which is safe.
    }
  },
};

/** What a sign-in in the in-app browser needs of the port. */
export interface BrowserSignIn {
  readonly endpoints: HirobaEndpoints;
  readonly os: MobileOs;
  readonly userAgent: string;
  /** Asked as the browser opens, so it follows a language picked since. */
  readonly closeLabel: () => string;
  /** Ends the session the port holds, and wipes what an attempt left. */
  readonly forget: () => Promise<void>;
}

/** Hiroba's sign-in in the in-app browser, whose cookies are the WebView's own. */
export async function signInInBrowser({
  endpoints,
  os,
  userAgent,
  closeLabel,
  forget,
}: BrowserSignIn): Promise<SignInOutcome> {
  await forget();
  await InAppBrowser.removeAllListeners();
  let landed = false;
  let refuser: string | null = null;
  let browserClosed: () => void = () => undefined;
  const closed = new Promise<void>((resolve) => {
    browserClosed = resolve;
  });
  // The in-app browser has no hook before a page loads, so a refuser's page shows for a moment.
  await InAppBrowser.addListener("browserPageNavigationCompleted", ({ url }) => {
    if (landed || refuser !== null) {
      return;
    }
    const step = signInStep(url, endpoints);
    if (step === "landed") {
      landed = true;
      void InAppBrowser.close();
    } else if (step === "refuser") {
      refuser = signInHost(url);
      void InAppBrowser.close();
    }
  });
  await InAppBrowser.addListener("browserClosed", () => browserClosed());
  try {
    await InAppBrowser.openInWebView({
      url: loginPageUrl(endpoints),
      options: {
        ...DefaultWebViewOptions,
        showURL: true,
        showNavigationButtons: false,
        closeButtonText: closeLabel(),
        ...(os === "ios" ? { customWebViewUserAgent: userAgent } : {}),
        android: {
          ...DefaultAndroidWebViewOptions,
          // Isolated (the default) means a cookie store the app can neither use nor clear.
          isIsolated: false,
          // Back would step off the card-select page, which ends the card session.
          hardwareBack: false,
        },
        iOS: {
          ...DefaultiOSWebViewOptions,
          // A swipe back would step off the card-select page, as Android's Back would.
          allowsBackForwardNavigationGestures: false,
        },
      },
    });
  } catch {
    await InAppBrowser.removeAllListeners();
    await forget();
    return { kind: "unavailable" };
  }
  await closed;
  await InAppBrowser.removeAllListeners();
  if (refuser !== null) {
    await forget();
    const entry = systemBrowserEntryUrl(endpoints);
    if (entry !== null) {
      await InAppBrowser.openInExternalBrowser({ url: entry });
    }
    return { kind: "refuser", host: refuser };
  }
  if (!landed) {
    await forget();
    return { kind: "cancelled" };
  }
  // clearCookies({url}) removes host cookies, not Domain cookies, so this is best effort.
  await CapacitorCookies.clearCookies({ url: `${idpOrigin(endpoints)}/` });
  await saveCookieStore();
  return { kind: "signedIn" };
}

/** Closes the in-app browser: a sign-in on its way ends as cancelled. */
export async function closeSignInBrowser(): Promise<void> {
  await InAppBrowser.close().catch(() => undefined);
}

// The WebView saves cookies on its own schedule; a swiped-away app could lose a fresh session.
// Capacitor has no flush; any cookie write ends in one, so delete a cookie that does not exist.
export async function saveCookieStore(): Promise<void> {
  await CapacitorCookies.deleteCookie({ key: "abth-save" });
}

/** Wipes the WebView's cookies, Hiroba's session with them. */
export async function clearCookieStore(): Promise<void> {
  await CapacitorCookies.clearAllCookies();
}
