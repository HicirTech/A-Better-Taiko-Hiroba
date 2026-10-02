/**
 * Stand-ins for the two Capacitor modules the Android layer calls, registered once for every test
 * file that imports this one. They record what the app asked of the platform; `native` is where a
 * test sets the platform's answers and reads the record.
 */
import { mock } from "bun:test";

/** What the app asked CapacitorHttp.request for: every option it sets, as it set it. */
export interface NativeHttpRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly responseType: string;
  readonly data?: unknown;
  readonly disableRedirects?: boolean;
  readonly connectTimeout?: number;
  readonly readTimeout?: number;
  readonly dataType?: string;
}

/** The shape CapacitorHttp.request answers with. */
export interface NativeHttpAnswer {
  readonly status: number;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly data: unknown;
}

type Listener = (event: { url?: string }) => void;

/**
 * A body as Capacitor hands back an `arraybuffer` answer: base64 as android.util.Base64.DEFAULT
 * writes it, in lines of 76 characters, each ending in a line break. Text is taken as UTF-8.
 */
export function nativeBase64(body: Uint8Array | string): string {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const base64 = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  return base64.replace(/.{1,76}/g, (line) => `${line}\n`);
}

/** A header name as a server writes it: `content-type` as `Content-Type`. */
const writtenAs = (name: string) =>
  name.replace(
    /(^|-)([a-z])/g,
    (_, dash: string, letter: string) => `${dash}${letter.toUpperCase()}`,
  );

/**
 * A fetch Response as Capacitor answers an `arraybuffer` request with it (HttpRequestHandler.
 * readData): a JSON content type is parsed whatever was asked, any other answer of 400 or more is
 * text, and the rest is base64 of the exact bytes. Header names come as a server writes them.
 */
export async function nativeAnswerOf(response: Response, url: string): Promise<NativeHttpAnswer> {
  const headers: Record<string, string> = {};
  for (const [name, value] of response.headers) {
    headers[writtenAs(name)] = value;
  }
  const json = (response.headers.get("content-type") ?? "").includes("application/json");
  let data: unknown;
  if (json) {
    const text = await response.text();
    data = text.trim() === "" ? "" : JSON.parse(text);
  } else if (response.status >= 400) {
    data = await response.text();
  } else {
    data = nativeBase64(new Uint8Array(await response.arrayBuffer()));
  }
  return { status: response.status, url, headers, data };
}

export const native = {
  httpRequests: [] as NativeHttpRequest[],
  httpAnswer: (async () => ({})) as () => Promise<unknown>,
  /** Answers for the calls to come, one each in turn; once they are used up, `httpAnswer` answers. */
  httpAnswers: [] as (() => Promise<unknown>)[],
  /** Every cookie-store call, in order: "clearAllCookies", "clearCookies <url>" or "deleteCookie <key>". */
  cookieCalls: [] as string[],
  openedWith: [] as { url: string; options: Record<string, unknown> }[],
  closeCalls: 0,
  openFails: false,
  /** close() resolves but the browser stays open, as seen on a slow real sign-in (2026-09-27). */
  closeIgnored: false,
  listeners: new Map<string, Listener>(),

  reset(): void {
    this.httpRequests.length = 0;
    this.httpAnswer = async () => ({});
    this.httpAnswers.length = 0;
    this.cookieCalls.length = 0;
    this.closeIgnored = false;
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
      return (native.httpAnswers.shift() ?? native.httpAnswer)();
    },
  },
  CapacitorCookies: {
    clearAllCookies: async () => {
      native.cookieCalls.push("clearAllCookies");
    },
    deleteCookie: async ({ key, url }: { key: string; url?: string }) => {
      native.cookieCalls.push(`deleteCookie ${key}${url === undefined ? "" : ` ${url}`}`);
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
      if (!native.closeIgnored) {
        queueMicrotask(() => native.emit("browserClosed"));
      }
    },
  },
}));
