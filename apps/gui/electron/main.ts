import { join } from "node:path";
import { err, ok } from "@abth/core";
import { app, BrowserWindow, type IpcMainInvokeEvent, ipcMain, Menu, session } from "electron";

import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  readOwnProfile,
} from "../src/hiroba-session";
import {
  BRIDGE_CHANNELS,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type ReadFailure,
  type SignInOutcome,
} from "../src/session-port";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { createDesktopWrites } from "./desktop-writes";
import { createHirobaTransport } from "./hiroba-transport";
import { saveReads } from "./save-reads";
import { createSessionStore, type SessionStore } from "./session-store";
import { openSignInWindow, type SignInAttempt } from "./sign-in-window";
import { createUndoStore } from "./undo-store";

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

// Which writes this run may send: the verified ones, and every other only in an unpackaged run
// started with ABTH_UNVERIFIED_WRITES=1. A packaged build ignores that variable.
const writeGate = { isPackaged: app.isPackaged, env: process.env };
// The clock a write checks Hiroba's daily break against. Development only: ABTH_DEV_NOW (an ISO
// time) fixes it, so a test runs at any hour and can try the break itself.
const writeClock = developmentClock();

function developmentClock(): () => Date {
  const fixed = app.isPackaged ? Number.NaN : Date.parse(process.env.ABTH_DEV_NOW ?? "");
  return Number.isNaN(fixed) ? () => new Date() : () => new Date(fixed);
}

app.enableSandbox();
registerAppScheme();

/**
 * The session cookie: held in this process, and kept on disk by `sessionStore` so the user stays
 * signed in across launches. Never logged, never sent to a renderer.
 */
let sessionCookie: string | null = null;
let sessionStore: SessionStore | null = null;
/**
 * Whose my page this run last read: the taiko number, which tells whose undo record is whose. It
 * stays in this process and is forgotten with the session.
 */
let owner: string | null = null;
const setSession = (value: string | null) => {
  sessionCookie = value;
  sessionStore?.save(value);
  if (value === null) {
    owner = null;
  }
};
let signInAttempt: SignInAttempt | null = null;
const transport = createHirobaTransport({
  session: {
    get: () => sessionCookie,
    // A token Hiroba rotates, or ends, on a redirect hop is kept on disk as well.
    set: setSession,
  },
  userAgent,
  hirobaOrigin: endpoints.hirobaOrigin,
});
// Debugging against the live site: keep each page a read brings back, in a local folder.
const readTransport =
  process.env.ABTH_DEBUG_SAVE_READS === "1"
    ? saveReads(transport, join(app.getPath("userData"), "debug"))
    : transport;

/**
 * Every verb that asks Hiroba something runs one at a time: a read never lands between a write's
 * posts and its read-back, and two writes never interleave.
 */
let hirobaQueue: Promise<unknown> = Promise.resolve();
function oneAtATime<A extends unknown[], R>(
  run: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return (...args) => {
    const turn = hirobaQueue.then(() => run(...args));
    hirobaQueue = turn.catch(() => undefined);
    return turn;
  };
}

/** A read that found the login page, or a card still to choose: the session is over. */
const sessionEnded = (failure: ReadFailure) =>
  failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
  serveWebBundle();
  // The session kept from the last launch, if any; the renderer asks for it through isSignedIn.
  sessionStore = createSessionStore(join(app.getPath("userData"), "session.json"));
  sessionCookie = sessionStore.load();
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

  // The writes: the gate, the undo record on disk, and the session dropped when Hiroba ends it.
  const writes = createDesktopWrites({
    transport: readTransport,
    endpoints,
    gate: writeGate,
    now: writeClock,
    undoStore: createUndoStore(join(app.getPath("userData"), "undo.json")),
    signedIn: () => sessionCookie !== null,
    endSession: () => setSession(null),
    owner: () => owner,
  });

  const port: HirobaSessionPort = {
    async isSignedIn() {
      return sessionCookie !== null;
    },
    async signIn(): Promise<SignInOutcome> {
      signInAttempt?.cancel();
      setSession(null);
      const attempt = openSignInWindow(mainWindow, endpoints, userAgent);
      signInAttempt = attempt;
      const result = await attempt.result;
      if (signInAttempt === attempt) {
        signInAttempt = null;
      }
      if (result.kind !== "captured") {
        return result;
      }
      setSession(result.cookie);
      return { kind: "signedIn" };
    },
    async cancelSignIn() {
      signInAttempt?.cancel();
    },
    readProfile: oneAtATime(async () => {
      if (sessionCookie === null) {
        return err({ kind: "notSignedIn" });
      }
      const read = await readOwnProfile(readTransport, endpoints);
      if (!read.ok) {
        if (sessionEnded(read.error)) {
          setSession(null);
        }
        return read;
      }
      owner = read.value.taikoNo;
      return ok(read.value.view);
    }),
    async signOut() {
      setSession(null);
    },
    enabledWrites: writes.enabledWrites,
    openCostumeEditor: oneAtATime(writes.openCostumeEditor),
    changeCostume: oneAtATime(writes.changeCostume),
    pendingUndo: writes.pendingUndo,
    undo: oneAtATime(writes.undo),
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
    const verb = method as keyof HirobaSessionPort;
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!trusted(event)) {
        throw new Error(`Refused ${channel} from an untrusted frame`);
      }
      // The arguments are the renderer's, so they are checked before the verb sees them.
      if (!PORT_ARGUMENTS[verb](args)) {
        throw new Error(`Refused ${channel}: arguments it does not take`);
      }
      return (port[verb] as (...values: unknown[]) => Promise<unknown>)(...args);
    });
  }

  await mainWindow.loadURL(devServerUrl ?? `${APP_ORIGIN}/`);
});

app.on("window-all-closed", () => app.quit());
