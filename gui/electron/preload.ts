import { contextBridge, ipcRenderer } from "electron";

import { BRIDGE_CHANNELS, type HirobaSessionPort } from "../src/session-port";

// The port's verbs and nothing else: no ipcRenderer, no generic invoke(channel), no cookie.
const port: HirobaSessionPort = {
  isSignedIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.isSignedIn),
  signIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signIn),
  cancelSignIn: () => ipcRenderer.invoke(BRIDGE_CHANNELS.cancelSignIn),
  // No argument crosses for a plain read: an undefined one is an argument the main process refuses.
  readProfile: (options) =>
    options === undefined
      ? ipcRenderer.invoke(BRIDGE_CHANNELS.readProfile)
      : ipcRenderer.invoke(BRIDGE_CHANNELS.readProfile, options),
  refreshHiroba: () => ipcRenderer.invoke(BRIDGE_CHANNELS.refreshHiroba),
  signOut: () => ipcRenderer.invoke(BRIDGE_CHANNELS.signOut),
  openCostumeEditor: () => ipcRenderer.invoke(BRIDGE_CHANNELS.openCostumeEditor),
  openTitleEditor: () => ipcRenderer.invoke(BRIDGE_CHANNELS.openTitleEditor),
  previewCostume: (set) => ipcRenderer.invoke(BRIDGE_CHANNELS.previewCostume, set),
  readPicture: (want) => ipcRenderer.invoke(BRIDGE_CHANNELS.readPicture, want),
  changeCostume: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeCostume, change),
  changeTitle: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeTitle, change),
  changeName: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeName, change),
  costumeHistory: () => ipcRenderer.invoke(BRIDGE_CHANNELS.costumeHistory),
  readUpdateFeed: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readUpdateFeed),
  openFavorites: () => ipcRenderer.invoke(BRIDGE_CHANNELS.openFavorites),
  changeFolder: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeFolder, change),
  changeFavoriteSong: (change) => ipcRenderer.invoke(BRIDGE_CHANNELS.changeFavoriteSong, change),
  readSongPicker: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readSongPicker),
  recentPlays: () => ipcRenderer.invoke(BRIDGE_CHANNELS.recentPlays),
  readRecentPlays: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readRecentPlays),
  recentPlaysProgress: () => ipcRenderer.invoke(BRIDGE_CHANNELS.recentPlaysProgress),
  readSongCatalogue: (since) => ipcRenderer.invoke(BRIDGE_CHANNELS.readSongCatalogue, since),
  readChineseNames: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readChineseNames),
  readChartPicture: (url) => ipcRenderer.invoke(BRIDGE_CHANNELS.readChartPicture, url),
  readPipelines: (history) => ipcRenderer.invoke(BRIDGE_CHANNELS.readPipelines, history),
};

contextBridge.exposeInMainWorld("abth", port);
