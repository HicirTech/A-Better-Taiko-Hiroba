import { err } from "@abth/core";
import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  idpOrigin,
  loginPageUrl,
  readProfile,
  SESSION_COOKIE_NAME,
  signInStep,
} from "../hiroba-session";
import type { HirobaSessionPort, SignInOutcome } from "../session-port";
import { createAndroidTransport } from "./android-transport";

// Development only (the Vite dev server behind live reload): a local stand-in for Hiroba and the ID
// host. A production build replaces import.meta.env.DEV with false and drops this branch; setting
// only one of the two stops the app rather than half-reaching the real sites.
const endpoints: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
    )
  : HIROBA_ENDPOINTS;

export interface AndroidPortOptions {
  /** The in-app browser's close button, from the catalog. */
  readonly closeLabel: string;
}

/**
 * The Android platform layer. The session lives only in the WebView's cookie store: the in-app
 * browser shares it (isIsolated: false), and Capacitor's HTTP client sends it. This code asks
 * whether the session cookie is there, never what it holds.
 *
 * The store keeps its cookies in app-private storage across launches, so a user stays signed in
 * until they sign out or Hiroba ends the session (the user's call, 2026-09-27). It is wiped when a
 * sign-in starts or is abandoned, at sign-out and when the session is found gone. After a sign-in,
 * the ID host's own cookies are cleared as far as the platform allows: clearCookies({url}) removes
 * host cookies, not Domain cookies, which is also why the session itself is only ever cleared with
 * clearAllCookies.
 */
export async function createAndroidPort(options: AndroidPortOptions): Promise<HirobaSessionPort> {
  const transport = createAndroidTransport();
  let signedIn = await holdsSession();

  const forget = async () => {
    signedIn = false;
    await CapacitorCookies.clearAllCookies();
  };

  return {
    async isSignedIn() {
      return signedIn;
    },

    async signIn() {
      await forget();
      await InAppBrowser.removeAllListeners();
      let landed = false;
      let browserClosed: () => void = () => undefined;
      const closed = new Promise<void>((resolve) => {
        browserClosed = resolve;
      });
      await InAppBrowser.addListener("browserPageNavigationCompleted", ({ url }) => {
        if (!landed && signInStep(url, endpoints) === "landed") {
          landed = true;
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
            closeButtonText: options.closeLabel,
            android: {
              ...DefaultAndroidWebViewOptions,
              // Default true since 4.0.0: an isolated view keeps its own cookie store, which the
              // app can neither use nor clear.
              isIsolated: false,
              // Default true walks back through the sign-in's history instead of closing, and
              // stepping back off the card-select page ends the card session.
              hardwareBack: false,
            },
          },
        });
      } catch {
        await InAppBrowser.removeAllListeners();
        await forget();
        return { kind: "unavailable" } satisfies SignInOutcome;
      }
      await closed;
      await InAppBrowser.removeAllListeners();
      if (!landed) {
        await forget();
        return { kind: "cancelled" } satisfies SignInOutcome;
      }
      // Whether a session really exists is settled by the first read, not here: the cookie's value
      // is out of reach by design.
      await CapacitorCookies.clearCookies({ url: `${idpOrigin(endpoints)}/` });
      signedIn = true;
      return { kind: "signedIn" } satisfies SignInOutcome;
    },

    async cancelSignIn() {
      await InAppBrowser.close().catch(() => undefined);
    },

    async readProfile() {
      if (!signedIn) {
        return err({ kind: "notSignedIn" });
      }
      const read = await readProfile(transport, endpoints);
      if (
        !read.ok &&
        (read.error.kind === "loggedOut" || read.error.kind === "cardSelectUnfinished")
      ) {
        await forget();
      }
      return read;
    },

    signOut: forget,
  };
}

/** Whether the WebView's cookie store holds a Hiroba session, by name only: the value is not read. */
async function holdsSession(): Promise<boolean> {
  const cookies = await CapacitorCookies.getCookies({ url: `${endpoints.hirobaOrigin}/` });
  return Object.hasOwn(cookies, SESSION_COOKIE_NAME);
}
