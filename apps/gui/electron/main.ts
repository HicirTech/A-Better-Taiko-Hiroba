import { join } from "node:path";
import { err, ok } from "@abth/core";
import { app, BrowserWindow, type IpcMainInvokeEvent, ipcMain, Menu, session } from "electron";

import {
  createHirobaQueue,
  createPictureReader,
  DESKTOP_PICTURE_LIMITS,
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  offeredOf,
  type PictureSources,
  previewCostume,
  readOwnProfile,
} from "../src/hiroba-session";
import {
  BRIDGE_CHANNELS,
  type CostumeSet,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type ReadFailure,
  type SignInOutcome,
  type WriteOutcomeView,
} from "../src/session-port";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { createDesktopWrites } from "./desktop-writes";
import { createHirobaTransport } from "./hiroba-transport";
import { createDiskPictureStore } from "./picture-disk-store";
import { saveReads } from "./save-reads";
import { createSessionStore, type SessionStore } from "./session-store";
import { openSignInWindow, type SignInAttempt } from "./sign-in-window";
import { createUndoStore } from "./undo-store";

// Development only, and never in a packaged build: the renderer from Vite's dev server, and a
// local stand-in for Hiroba and the ID host so the whole sign-in can run without the real sites.
// Setting only one of the two endpoint overrides stops the app rather than half-reaching Hiroba.
// The picture host's is optional: without it, a stand-in run asks no picture host anything.
const devServerUrl = app.isPackaged ? undefined : process.env.ABTH_DEV_SERVER_URL;
const endpoints: HirobaEndpoints = app.isPackaged ? HIROBA_ENDPOINTS : developmentEndpoints();

function developmentEndpoints(): HirobaEndpoints {
  try {
    return endpointsFromOverrides(
      process.env.ABTH_DEV_HIROBA_ORIGIN,
      process.env.ABTH_DEV_IDP_HOST,
      process.env.ABTH_DEV_IMG_ORIGIN,
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

// Development only: lets the end-to-end run and the dev run against the mock keep their profiles
// out of the real %APPDATA%, where the installed app keeps its session and undo record.
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
/**
 * Where the pictures that page showed are, checked: the title plate's source among them. Kept
 * beside `owner`, in this process, and forgotten with the session; null before the first read.
 */
let sources: PictureSources | null = null;
/**
 * The items the last costume editor read offered: the only ones whose thumbnail may be asked for.
 * It stays in this process and is forgotten with the session.
 */
let offered: ReadonlySet<string> = new Set();
const setSession = (value: string | null) => {
  sessionCookie = value;
  sessionStore?.save(value);
  if (value === null) {
    owner = null;
    sources = null;
    offered = new Set();
    pictures.forget();
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
 * posts and its read-back, and two writes never interleave. A write asked for while another is
 * queued or running answers `busy` and sends nothing.
 */
const queue = createHirobaQueue();
const { oneAtATime, oneWriteAtATime } = queue;

/**
 * Hiroba's pictures for the window, kept on disk in the app's data folder across launches and
 * sign-outs, each fetched once. Only a picture's fetch waits in the queue, never the whole call: one
 * already kept answers at once, even while a write runs.
 */
const pictures = createPictureReader({
  transport: readTransport,
  endpoints,
  store: createDiskPictureStore(join(app.getPath("userData"), "pictures")),
  queue,
  limits: DESKTOP_PICTURE_LIMITS,
  state: () => ({ signedIn: sessionCookie !== null, offered, owner, sources }),
});
const BUSY: WriteOutcomeView = { kind: "busy" };

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
      // Every read but the session's first is the user's Read again: the portrait is renewed.
      pictures.myPageAsked();
      const read = await readOwnProfile(readTransport, endpoints);
      if (!read.ok) {
        if (sessionEnded(read.error)) {
          setSession(null);
        }
        return read;
      }
      owner = read.value.taikoNo;
      sources = read.value.pictures;
      // The session held: the plates fetched before this read are the player's own.
      await pictures.confirm(read.value.taikoNo);
      return ok(read.value.view);
    }),
    async signOut() {
      setSession(null);
    },
    enabledWrites: writes.enabledWrites,
    // The items it offers are the only ones whose thumbnail the window may ask for next.
    openCostumeEditor: oneAtATime(async () => {
      const read = await writes.openCostumeEditor();
      if (read.ok) {
        offered = offeredOf(read.value);
      }
      return read;
    }),
    // A read that changes nothing, so no write gate: in the queue like every request to Hiroba, so
    // it never lands between a write's posts and its read-back. Its failure leaves the session be:
    // the next read of a page says whether it is over. Kept as its latest copy alone when reads are
    // saved for debugging (save-reads.ts).
    previewCostume: oneAtATime(async (set: CostumeSet) => {
      if (sessionCookie === null) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(readTransport, endpoints, set);
    }),
    readPicture: (want) => pictures.read(want),
    changeCostume: oneWriteAtATime(writes.changeCostume, BUSY),
    pendingUndo: writes.pendingUndo,
    undo: oneWriteAtATime(writes.undo, BUSY),
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
