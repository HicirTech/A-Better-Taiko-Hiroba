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
 * browser shares it (isIsolated: false), and Capacitor's HTTP client reads it. This code knows
 * whether a sign-in finished, never the cookie's value.
 *
 * The store writes its cookies to app-private storage, so everything in it is wiped at every
 * launch, when a sign-in starts or is abandoned, at sign-out and when the session is found gone;
 * that is how "no sign-in between launches" holds here. After a sign-in, the ID host's own
 * cookies are cleared as far as the platform allows: clearCookies({url}) removes host cookies, not
 * Domain cookies, which is also why the session itself is only ever cleared with clearAllCookies.
 */
export async function createAndroidPort(options: AndroidPortOptions): Promise<HirobaSessionPort> {
  await CapacitorCookies.clearAllCookies();
  const transport = createAndroidTransport();
  let signedIn = false;

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
