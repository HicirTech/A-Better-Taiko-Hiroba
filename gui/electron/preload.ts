import { contextBridge, ipcRenderer } from "electron";

import type { DesktopPictures } from "../src/platform/desktop-share";
// Not the index: a sandboxed preload can load no module but electron's, and the index loads core.
import { PICTURE_CHANNELS } from "../src/shared/session-port/bridge-channels";
import { PORT_CALLS } from "../src/shared/session-port/port-calls";
import type { HirobaSessionPort } from "../src/shared/session-port/types";

/** A call's own arguments, less an undefined one at the end, which the main process refuses. */
function sent(args: readonly unknown[], takes: number): readonly unknown[] {
  const own = args.slice(0, takes);
  return own.slice(0, own.findLastIndex((arg) => arg !== undefined) + 1);
}

// The port's verbs, a picture's ways out, and nothing else: no ipcRenderer, no generic
// invoke(channel), no cookie.
const port: Partial<Record<keyof HirobaSessionPort, (...args: unknown[]) => Promise<unknown>>> = {};
for (const [verb, { channel, takes }] of Object.entries(PORT_CALLS)) {
  port[verb as keyof HirobaSessionPort] = (...args) =>
    ipcRenderer.invoke(channel, ...sent(args, takes));
}

const pictures: DesktopPictures = {
  copy: (png) => ipcRenderer.invoke(PICTURE_CHANNELS.copy, png),
  save: (webp, name) => ipcRenderer.invoke(PICTURE_CHANNELS.save, webp, name),
};

contextBridge.exposeInMainWorld("abth", port);
contextBridge.exposeInMainWorld("abthPictures", pictures);
