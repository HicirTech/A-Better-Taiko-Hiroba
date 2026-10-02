import { contextBridge, ipcRenderer } from "electron";

import { BRIDGE_CHANNELS, type HirobaSessionPort } from "../src/session-port";

// The port's verbs and nothing else: no ipcRenderer, no generic invoke(channel), no cookie.
const port: HirobaSessionPort = {
  isSignedIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.isSignedIn),
  signIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signIn),
  cancelSignIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.cancelSignIn),
  readProfile: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readProfile),
  signOut: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signOut),
  openCostumeEditor: () => ipcRenderer.invoke(BRIDGE_CHANNELS.openCostumeEditor),
  openTitleEditor: () => ipcRenderer.invoke(BRIDGE_CHANNELS.openTitleEditor),
  previewCostume: (set) => ipcRenderer.invoke(BRIDGE_CHANNELS.previewCostume, set),
  readPicture: (want) => ipcRenderer.invoke(BRIDGE_CHANNELS.readPicture, want),
  changeCostume: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeCostume, change),
  changeTitle: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeTitle, change),
  changeName: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeName, change),
  pendingUndo: () => ipcRenderer.invoke(BRIDGE_CHANNELS.pendingUndo),
  undo: (kind) => ipcRenderer.invoke(BRIDGE_CHANNELS.undo, kind),
};

contextBridge.exposeInMainWorld("abth", port);
