import type { MessageKey, Translator } from "@abth/i18n";

import type { PictureWant } from "../session-port";

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

/** Each of Hiroba's pictures' names, by the kind its group is for. */
export const PICTURE_NAMES: Readonly<Record<string, MessageKey>> = {
  myDon: "pipelines.picture.myDon",
  titlePlate: "pipelines.picture.titlePlate",
  medalPlate: "pipelines.picture.medalPlate",
  scorePanel: "pipelines.picture.scorePanel",
  rankIcon: "pipelines.picture.rankIcon",
  crownIcon: "pipelines.picture.crownIcon",
  courseIcon: "pipelines.picture.courseIcon",
  costumeItem: "pipelines.picture.costumeItem",
} satisfies Record<PictureWant["kind"], MessageKey>;

/** An operation's name, or the name it runs as when this version has none for it. */
export function operationName(i18n: Translator, operation: string): string {
  const key = Object.hasOwn(OPERATION_NAMES, operation) ? OPERATION_NAMES[operation] : undefined;
  return key === undefined ? operation : i18n.t(key);
}

/** A group's name: what its picture shows, for a picture, and its operation's otherwise. */
export function groupName(
  i18n: Translator,
  group: { readonly operation: string; readonly subject?: string },
): string {
  const { subject } = group;
  const key =
    subject !== undefined && Object.hasOwn(PICTURE_NAMES, subject)
      ? PICTURE_NAMES[subject]
      : undefined;
  return key === undefined ? operationName(i18n, group.operation) : i18n.t(key);
}
