import { contextBridge, ipcRenderer } from "electron";

import { BRIDGE_CHANNELS, type HirobaSessionPort } from "../src/session-port";

// The port's verbs and nothing else: no ipcRenderer, no generic invoke(channel), no cookie.
const port: HirobaSessionPort = {
  isSignedIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.isSignedIn),
  signIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signIn),
  cancelSignIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.cancelSignIn),
  readProfile: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readProfile),
  signOut: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signOut),
};

contextBridge.exposeInMainWorld("abth", port);
