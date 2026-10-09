import type { MessageKey, Translator } from "@abth/i18n";

/** Each operation's name on the pipelines page, by the name its group runs as. */
export const OPERATION_NAMES: Readonly<Record<string, MessageKey>> = {
  readProfile: "pipelines.op.readProfile",
  openCostumeEditor: "pipelines.op.openCostumeEditor",
  openTitleEditor: "pipelines.op.openTitleEditor",
  previewCostume: "pipelines.op.previewCostume",
  changeCostume: "pipelines.op.changeCostume",
  changeTitle: "pipelines.op.changeTitle",
  changeName: "pipelines.op.changeName",
  openFavorites: "pipelines.op.openFavorites",
  changeFolder: "pipelines.op.changeFolder",
  changeFavoriteSong: "pipelines.op.changeFavoriteSong",
  readSongPicker: "pipelines.op.readSongPicker",
  readUpdateFeed: "pipelines.op.readUpdateFeed",
  readSongCatalogue: "pipelines.op.readSongCatalogue",
  readChineseNames: "pipelines.op.readChineseNames",
  picture: "pipelines.op.picture",
  chartPicture: "pipelines.op.chartPicture",
};

/** An operation's name, or the name it runs as when this version has none for it. */
export function operationName(i18n: Translator, operation: string): string {
  const key = Object.hasOwn(OPERATION_NAMES, operation) ? OPERATION_NAMES[operation] : undefined;
  return key === undefined ? operation : i18n.t(key);
}
