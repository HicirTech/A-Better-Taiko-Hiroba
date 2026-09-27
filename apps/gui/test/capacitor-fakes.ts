/**
 * Stand-ins for the two Capacitor modules the Android layer calls, registered once for every test
 * file that imports this one. They record what the app asked of the platform; `native` is where a
 * test sets the platform's answers and reads the record.
 */
import { mock } from "bun:test";

export interface NativeHttpRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly responseType: string;
}

type Listener = (event: { url?: string }) => void;

export const native = {
  httpRequests: [] as NativeHttpRequest[],
  httpAnswer: (async () => ({})) as () => Promise<unknown>,
  /** Every cookie-store write, in order: "clearAllCookies" or "clearCookies <url>". */
  cookieCalls: [] as string[],
  /** The cookies the store holds, by name, as getCookies answers for Hiroba. */
  cookies: {} as Record<string, string>,
  openedWith: [] as { url: string; options: Record<string, unknown> }[],
  closeCalls: 0,
  openFails: false,
  listeners: new Map<string, Listener>(),

  reset(): void {
    this.httpRequests.length = 0;
    this.httpAnswer = async () => ({});
    this.cookieCalls.length = 0;
    this.cookies = {};
    this.openedWith.length = 0;
    this.closeCalls = 0;
    this.openFails = false;
    this.listeners.clear();
  },

  /** What the in-app browser reports as the user moves through pages. */
  emit(event: string, data: { url?: string } = {}): void {
    this.listeners.get(event)?.(data);
  },
};

mock.module("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android" },
  CapacitorHttp: {
    request: (options: NativeHttpRequest) => {
      native.httpRequests.push(options);
      return native.httpAnswer();
    },
  },
  CapacitorCookies: {
    getCookies: async () => ({ ...native.cookies }),
    clearAllCookies: async () => {
      native.cookieCalls.push("clearAllCookies");
      native.cookies = {};
    },
    clearCookies: async ({ url }: { url: string }) => {
      native.cookieCalls.push(`clearCookies ${url}`);
    },
  },
}));

mock.module("@capacitor/inappbrowser", () => ({
  // The library's own defaults (dist/plugin.mjs, 4.0.3), which the app must override.
  DefaultWebViewOptions: {
    showToolbar: true,
    showURL: true,
    clearCache: true,
    closeButtonText: "Close",
  },
  DefaultAndroidWebViewOptions: {
    allowZoom: false,
    hardwareBack: true,
    pauseMedia: true,
    isIsolated: true,
  },
  InAppBrowser: {
    addListener: async (event: string, listener: Listener) => {
      native.listeners.set(event, listener);
      return { remove: async () => native.listeners.delete(event) };
    },
    removeAllListeners: async () => {
      native.listeners.clear();
    },
    openInWebView: async (args: { url: string; options: Record<string, unknown> }) => {
      if (native.openFails) {
        throw new Error("No activity to open the browser in");
      }
      native.openedWith.push(args);
    },
    close: async () => {
      native.closeCalls += 1;
      queueMicrotask(() => native.emit("browserClosed"));
    },
  },
}));
