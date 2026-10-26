import { contextBridge, ipcRenderer } from "electron";

import type { DesktopPictures } from "../src/platform/desktop-share";
// Not the index: a sandboxed preload can load no module but electron's, and the index loads core.
import { BRIDGE_CHANNELS, PICTURE_CHANNELS } from "../src/shared/session-port/bridge-channels";
import type { HirobaSessionPort } from "../src/shared/session-port/types";

// The port's verbs, a picture's ways out, and nothing else: no ipcRenderer, no generic
// invoke(channel), no cookie.
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
  scores: () => ipcRenderer.invoke(BRIDGE_CHANNELS.scores),
  listedCharts: () => ipcRenderer.invoke(BRIDGE_CHANNELS.listedCharts),
  readScores: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readScores),
  readEveryScore: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readEveryScore),
  readSongScores: (songNo, played) =>
    ipcRenderer.invoke(BRIDGE_CHANNELS.readSongScores, songNo, played),
  scoresProgress: () => ipcRenderer.invoke(BRIDGE_CHANNELS.scoresProgress),
  readSongCatalogue: (since) => ipcRenderer.invoke(BRIDGE_CHANNELS.readSongCatalogue, since),
  readChineseNames: () => ipcRenderer.invoke(BRIDGE_CHANNELS.readChineseNames),
  readRatingData: (system) => ipcRenderer.invoke(BRIDGE_CHANNELS.readRatingData, system),
  readChartPicture: (url, read) => ipcRenderer.invoke(BRIDGE_CHANNELS.readChartPicture, url, read),
  readCdnChart: (songNo, difficulty, read) =>
    ipcRenderer.invoke(BRIDGE_CHANNELS.readCdnChart, songNo, difficulty, read),
  readChartDensity: (songNo, again) =>
    ipcRenderer.invoke(BRIDGE_CHANNELS.readChartDensity, songNo, again),
  readChartTja: (songNo) => ipcRenderer.invoke(BRIDGE_CHANNELS.readChartTja, songNo),
  readDrawnChart: (songNo, difficulty) =>
    ipcRenderer.invoke(BRIDGE_CHANNELS.readDrawnChart, songNo, difficulty),
  keepDrawnChart: (songNo, difficulty, png) =>
    ipcRenderer.invoke(BRIDGE_CHANNELS.keepDrawnChart, songNo, difficulty, png),
  readPipelines: (history) => ipcRenderer.invoke(BRIDGE_CHANNELS.readPipelines, history),
};

const pictures: DesktopPictures = {
  copy: (png) => ipcRenderer.invoke(PICTURE_CHANNELS.copy, png),
  save: (png, name) => ipcRenderer.invoke(PICTURE_CHANNELS.save, png, name),
};

contextBridge.exposeInMainWorld("abth", port);
contextBridge.exposeInMainWorld("abthPictures", pictures);
