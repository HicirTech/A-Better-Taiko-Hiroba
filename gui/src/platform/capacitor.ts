import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultiOSWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  CAPACITOR_PICTURE_LIMITS,
  createHirobaServices,
  createMemoryPictureStore,
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  idpOrigin,
  KEPT_COSTUME_HISTORY,
  KEPT_FOLDER_HISTORY,
  type KeptStore,
  type KeptThing,
  keptMemoryStore,
  loginPageUrl,
  queuePort,
  type SiteAddresses,
  signInHost,
  signInStep,
  systemBrowserEntryUrl,
} from "../hiroba-session";
import { createMemoryPipelineStore } from "../shared/pipelines";
import { RATING_DATA_URL } from "../shared/rating-data/rating-links";
import { checkedPort, type HirobaSessionPort, type SignInOutcome } from "../shared/session-port";
import {
  ABTH_CDN_URL,
  CHINESE_NAMES_URL,
  catalogueUrlFor,
  chartOriginFor,
  ESE_CHARTS_URL,
  ESE_MAPPING_URL,
} from "../shared/song-catalogue";
import { feedUrlFor } from "../shared/updates";
import type { DatabaseFactory } from "./capacitor-indexeddb";
import {
  CHART_DENSITY_DATABASE,
  CHART_PICTURE_DATABASE,
  createIndexedDbPictureStore,
  DRAWN_CHART_DATABASE,
} from "./capacitor-picture-store";
import { createIndexedDbPipelineStores } from "./capacitor-pipeline-store";
import { createCapacitorTransport } from "./capacitor-transport";
import { keptIndexedDbStore } from "./kept-indexeddb-store";
import { safariUserAgent } from "./safari-user-agent";
import type { MobileOs } from "./system-os";

const endpoints: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
      import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_REFUSING_HOST,
    )
  : HIROBA_ENDPOINTS;

const DEV = Boolean(import.meta.env.DEV);
// Each variable is named outright: Vite fills in only the names it can see.
const SITES: SiteAddresses = {
  updateFeedUrl: feedUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_UPDATE_FEED),
  songCatalogueUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_SONG_CATALOGUE),
  chineseNamesUrl: catalogueUrlFor(
    DEV,
    import.meta.env.VITE_ABTH_DEV_CHINESE_NAMES,
    CHINESE_NAMES_URL,
  ),
  ratingDataUrls: {
    ourtaikoV1: catalogueUrlFor(
      DEV,
      import.meta.env.VITE_ABTH_DEV_RATING_DATA,
      RATING_DATA_URL.ourtaikoV1,
    ),
    ourtaikoV2: catalogueUrlFor(
      DEV,
      import.meta.env.VITE_ABTH_DEV_RATING_DATA_V2,
      RATING_DATA_URL.ourtaikoV2,
    ),
  },
  chartOrigin: chartOriginFor(DEV, import.meta.env.VITE_ABTH_DEV_CHART_ORIGIN),
  eseMappingUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ESE_MAPPING, ESE_MAPPING_URL),
  eseChartsUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ESE_CHARTS, ESE_CHARTS_URL),
  cdnUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ABTH_CDN, ABTH_CDN_URL),
};

export interface CapacitorPortOptions {
  /** Android unless said otherwise. */
  readonly os?: MobileOs;
  /** Asked each time the browser opens, so it follows a language picked since. */
  readonly closeLabel: () => string;
  /** Remembers a finished sign-in: CapacitorCookies.getCookies cannot see the session cookie. */
  readonly signedInFlag?: SignedInFlag;
  /** Keeps pictures and costume histories across launches. Without it, pictures stay in memory
   * and the history is empty. */
  readonly indexedDb?: DatabaseFactory;
  /** The clock a write checks Hiroba's daily break against. */
  readonly now?: () => Date;
}

/** Refuses every call, so a history is simply empty. */
const nowhere = <T, M>(): KeptStore<T, M> => ({
  load: () => Promise.reject(new Error("There is nowhere to keep a history")),
  save: () => Promise.reject(new Error("There is nowhere to keep a history")),
});
const HISTORIES: ReadonlySet<object> = new Set([KEPT_COSTUME_HISTORY, KEPT_FOLDER_HISTORY]);

/** Kept in IndexedDB; without it in memory, but for the histories, which are kept nowhere. */
function keptOnDevice<T, M>(
  indexedDb: DatabaseFactory | undefined,
  thing: KeptThing<T, M>,
): KeptStore<T, M> {
  if (indexedDb !== undefined) {
    return keptIndexedDbStore(indexedDb, thing);
  }
  return HISTORIES.has(thing) ? nowhere() : keptMemoryStore(thing);
}

export interface SignedInFlag {
  get(): boolean;
  set(value: boolean): void;
}

const SIGNED_IN_KEY = "abth.signedIn";

const localStorageFlag: SignedInFlag = {
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

/** Capacitor's port. Its session is the native cookie store, which this code cannot read. */
export async function createCapacitorPort(
  options: CapacitorPortOptions,
): Promise<HirobaSessionPort> {
  const os = options.os ?? "android";
  const userAgent = os === "ios" ? safariUserAgent(navigator.userAgent) : navigator.userAgent;
  const transport = createCapacitorTransport(userAgent, os);
  const flag = options.signedInFlag ?? localStorageFlag;
  let signedIn = flag.get();
  const { indexedDb } = options;
  const pictureStore = (database?: string) =>
    indexedDb === undefined
      ? createMemoryPictureStore()
      : createIndexedDbPictureStore(indexedDb, database);
  const services = createHirobaServices({
    endpoints,
    sites: SITES,
    platform: os,
    now: options.now ?? (() => new Date()),
    hiroba: transport,
    external: transport,
    pictureLimits: CAPACITOR_PICTURE_LIMITS,
    stores: {
      pipeline:
        indexedDb === undefined
          ? () => createMemoryPipelineStore()
          : createIndexedDbPipelineStores(indexedDb),
      kept: (thing) => keptOnDevice(indexedDb, thing),
      pictures: pictureStore(),
      charts: pictureStore(CHART_PICTURE_DATABASE),
      densities: pictureStore(CHART_DENSITY_DATABASE),
      drawnCharts: pictureStore(DRAWN_CHART_DATABASE),
    },
    signedIn: () => signedIn,
    endSession: async () => {
      signedIn = false;
      flag.set(false);
      await CapacitorCookies.clearAllCookies();
    },
    // Hiroba may renew the session on a read or a write; keep the new one.
    afterHiroba: saveCookieStore,
  });
  const { forget } = services;

  const port = queuePort(services.pipelines, {
    ...services.verbs,
    async isSignedIn() {
      return signedIn;
    },

    async signIn() {
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
            closeButtonText: options.closeLabel(),
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
        return { kind: "unavailable" } satisfies SignInOutcome;
      }
      await closed;
      await InAppBrowser.removeAllListeners();
      if (refuser !== null) {
        await forget();
        const entry = systemBrowserEntryUrl(endpoints);
        if (entry !== null) {
          await InAppBrowser.openInExternalBrowser({ url: entry });
        }
        return { kind: "refuser", host: refuser } satisfies SignInOutcome;
      }
      if (!landed) {
        await forget();
        return { kind: "cancelled" } satisfies SignInOutcome;
      }
      // clearCookies({url}) removes host cookies, not Domain cookies, so this is best effort.
      await CapacitorCookies.clearCookies({ url: `${idpOrigin(endpoints)}/` });
      await saveCookieStore();
      signedIn = true;
      flag.set(true);
      return { kind: "signedIn" } satisfies SignInOutcome;
    },

    async cancelSignIn() {
      await InAppBrowser.close().catch(() => undefined);
    },
  });

  return checkedPort(port);
}

// The WebView saves cookies on its own schedule; a swiped-away app could lose a fresh session.
// Capacitor has no flush; any cookie write ends in one, so delete a cookie that does not exist.
async function saveCookieStore(): Promise<void> {
  await CapacitorCookies.deleteCookie({ key: "abth-save" });
}
