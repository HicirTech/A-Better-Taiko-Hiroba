import { join } from "node:path";
import { err } from "@abth/core";
import { app, BrowserWindow, type IpcMainInvokeEvent, ipcMain, Menu, session } from "electron";

import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  readProfile,
} from "../src/hiroba-session";
import { BRIDGE_CHANNELS, type HirobaSessionPort, type SignInOutcome } from "../src/session-port";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { createHirobaTransport } from "./hiroba-transport";
import { saveReads } from "./save-reads";
import { openSignInWindow, type SignInAttempt } from "./sign-in-window";

// Development only, and never in a packaged build: the renderer from Vite's dev server, and a
// local stand-in for Hiroba and the ID host so the whole sign-in can run without the real sites.
// Setting only one of the two endpoint overrides stops the app rather than half-reaching Hiroba.
const devServerUrl = app.isPackaged ? undefined : process.env.ABTH_DEV_SERVER_URL;
const endpoints: HirobaEndpoints = app.isPackaged ? HIROBA_ENDPOINTS : developmentEndpoints();

function developmentEndpoints(): HirobaEndpoints {
  try {
    return endpointsFromOverrides(
      process.env.ABTH_DEV_HIROBA_ORIGIN,
      process.env.ABTH_DEV_IDP_HOST,
    );
  } catch (error) {
    // Not thrown: an uncaught error in the main process opens a dialog and waits.
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Hiroba answers anything that does not look like a complete browser with a data-less page. The
// default string also names Electron and the app, so it is replaced with plain Chrome's, in the
// reduced form Chrome itself sends.
const chromeMajor = process.versions.chrome.split(".")[0];
const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
app.userAgentFallback = userAgent;

// Development only: lets the end-to-end run keep its profile out of the real %APPDATA%.
if (!app.isPackaged && process.env.ABTH_DEV_USER_DATA) {
  app.setPath("userData", process.env.ABTH_DEV_USER_DATA);
}

app.enableSandbox();
registerAppScheme();

/** The session cookie: in this process's memory only, never logged, never sent to a renderer. */
let sessionCookie: string | null = null;
let signInAttempt: SignInAttempt | null = null;
const transport = createHirobaTransport({
  session: {
    get: () => sessionCookie,
    set: (value) => {
      sessionCookie = value;
    },
  },
  userAgent,
  hirobaOrigin: endpoints.hirobaOrigin,
});
// Debugging against the live site: keep each page a read brings back, in a local folder.
const readTransport =
  process.env.ABTH_DEBUG_SAVE_READS === "1"
    ? saveReads(transport, join(app.getPath("userData"), "debug"))
    : transport;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
  serveWebBundle();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );

  const mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(app.getAppPath(), "out", "electron", "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  const port: HirobaSessionPort = {
    async isSignedIn() {
      return sessionCookie !== null;
    },
    async signIn(): Promise<SignInOutcome> {
      signInAttempt?.cancel();
      sessionCookie = null;
      const attempt = openSignInWindow(mainWindow, endpoints, userAgent);
      signInAttempt = attempt;
      const result = await attempt.result;
      if (signInAttempt === attempt) {
        signInAttempt = null;
      }
      if (result.kind !== "captured") {
        return result;
      }
      sessionCookie = result.cookie;
      return { kind: "signedIn" };
    },
    async cancelSignIn() {
      signInAttempt?.cancel();
    },
    async readProfile() {
      if (sessionCookie === null) {
        return err({ kind: "notSignedIn" });
      }
      const read = await readProfile(readTransport, endpoints);
      if (
        !read.ok &&
        (read.error.kind === "loggedOut" || read.error.kind === "cardSelectUnfinished")
      ) {
        sessionCookie = null;
      }
      return read;
    },
    async signOut() {
      sessionCookie = null;
    },
  };

  // Scheme and host, compared by hand: URL.origin is "null" for a custom scheme such as app:.
  const originOf = (raw: string) => {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  };
  const expectedOrigin = originOf(devServerUrl ?? APP_ORIGIN);
  const trusted = (event: IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url;
    return url !== undefined && originOf(url) === expectedOrigin;
  };
  for (const [method, channel] of Object.entries(BRIDGE_CHANNELS)) {
    ipcMain.handle(channel, (event) => {
      if (!trusted(event)) {
        throw new Error(`Refused ${channel} from an untrusted frame`);
      }
      return port[method as keyof HirobaSessionPort]();
    });
  }

  await mainWindow.loadURL(devServerUrl ?? `${APP_ORIGIN}/`);
});

app.on("window-all-closed", () => app.quit());
