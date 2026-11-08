import { join } from "node:path";

import {
  createHirobaServices,
  DESKTOP_PICTURE_LIMITS,
  type HirobaEndpoints,
  queuePort,
  type SiteAddresses,
} from "../src/hiroba-session";
import {
  BRIDGE_CHANNELS,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type SignInOutcome,
} from "../src/shared/session-port";
import { DATA_FOLDER } from "./data-folder";
import { createHirobaTransport, type HirobaTransportOptions } from "./hiroba-transport";
import { keptFileStore } from "./kept-file-store";
import { createDiskPictureStore } from "./picture-disk-store";
import { createPipelineHistoryStore } from "./pipeline-history-store";
import { saveReads } from "./save-reads";
import { createSessionStore } from "./session-store";
import type { SignInAttempt } from "./sign-in-window";
import { createUpdateFeedTransport } from "./update-feed-transport";

/** What the desktop's port is built from; none of it needs Electron. */
export interface DesktopPortParts extends Pick<HirobaTransportOptions, "userAgent" | "fetch"> {
  readonly endpoints: HirobaEndpoints;
  readonly sites: SiteAddresses;
  /** The clock a write checks Hiroba's daily break against. */
  readonly now: () => Date;
  /** Where the session, the pipelines' histories, the pictures and the kept data are kept. */
  readonly dataFolder: string;
  /** Where a debug copy of each read goes; undefined keeps none. */
  readonly savedReads: string | undefined;
  /** Opens Hiroba's sign-in in a window of the app's own. */
  readonly openSignIn: () => SignInAttempt;
}

/** The desktop's port, answered in the main process, where the session stays. */
export function createDesktopPort(parts: DesktopPortParts): HirobaSessionPort {
  const { endpoints, dataFolder } = parts;
  const inDataFolder = (...names: string[]) => join(dataFolder, ...names);
  const asked = {
    userAgent: parts.userAgent,
    hirobaOrigin: endpoints.hirobaOrigin,
    ...(parts.fetch !== undefined && { fetch: parts.fetch }),
  };
  // The session cookie is held in this process: never logged, never sent to a renderer.
  const sessionStore = createSessionStore(inDataFolder(DATA_FOLDER.session));
  let sessionCookie = sessionStore.load();
  const keepSession = (value: string | null) => {
    sessionCookie = value;
    sessionStore.save(value);
  };
  // A session Hiroba ends is ended here too, and the services let go of what they held of it.
  const setSession = (value: string | null) => {
    if (value === null) {
      void services.forget();
    } else {
      keepSession(value);
    }
  };
  const transport = createHirobaTransport({
    ...asked,
    session: {
      get: () => sessionCookie,
      // A token Hiroba rotates, or ends, on a redirect hop is kept on disk as well.
      set: setSession,
    },
  });
  const services = createHirobaServices({
    endpoints,
    sites: parts.sites,
    platform: "desktop",
    now: parts.now,
    hiroba: parts.savedReads === undefined ? transport : saveReads(transport, parts.savedReads),
    external: createUpdateFeedTransport(asked),
    pictureLimits: DESKTOP_PICTURE_LIMITS,
    stores: {
      pipeline: (name) =>
        createPipelineHistoryStore(inDataFolder(DATA_FOLDER.pipelines, `${name}.json`)),
      kept: (thing) => keptFileStore(dataFolder, thing),
      pictures: createDiskPictureStore(inDataFolder(DATA_FOLDER.pictures)),
      charts: createDiskPictureStore(inDataFolder(DATA_FOLDER.charts)),
      densities: createDiskPictureStore(inDataFolder(DATA_FOLDER.densities)),
      drawnCharts: createDiskPictureStore(inDataFolder(DATA_FOLDER.drawnCharts)),
    },
    signedIn: () => sessionCookie !== null,
    endSession: () => keepSession(null),
  });

  let signInAttempt: SignInAttempt | null = null;
  return queuePort(services.pipelines, {
    ...services.verbs,
    async isSignedIn() {
      return sessionCookie !== null;
    },
    async signIn(): Promise<SignInOutcome> {
      signInAttempt?.cancel();
      setSession(null);
      const attempt = parts.openSignIn();
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
  });
}

/** Where the main process hears the window's calls: Electron's `ipcMain`, or a test's. */
export interface PortChannels<E> {
  handle(channel: string, answer: (event: E, ...args: unknown[]) => unknown): void;
}

/** Answers each call on its channel, for a frame the app trusts and arguments the call takes. */
export function handlePortCalls<E>(
  port: HirobaSessionPort,
  channels: PortChannels<E>,
  trusted: (event: E) => boolean,
): void {
  for (const [method, channel] of Object.entries(BRIDGE_CHANNELS)) {
    const verb = method as keyof HirobaSessionPort;
    channels.handle(channel, (event, ...args) => {
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
}
