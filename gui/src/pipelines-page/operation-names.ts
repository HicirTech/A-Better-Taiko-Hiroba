import type { Genre, Level } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import { DIFFICULTY_LABEL, GENRE_LABEL, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import type { PictureWant } from "../session-port";

/** Each operation's name on the pipelines page, by the name its group runs as. */
export const OPERATION_NAMES: Readonly<Record<string, MessageKey>> = {
  readProfile: "pipelines.op.readProfile",
  refreshHiroba: "pipelines.op.refreshHiroba",
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
  optionIcon: "pipelines.picture.optionIcon",
  costumeItem: "pipelines.picture.costumeItem",
} satisfies Record<PictureWant["kind"], MessageKey>;

/** An operation's name, or the name it runs as when this version has none for it. */
export function operationName(i18n: Translator, operation: string): string {
  const key = Object.hasOwn(OPERATION_NAMES, operation) ? OPERATION_NAMES[operation] : undefined;
  return key === undefined ? operation : i18n.t(key);
}

/** The operations whose subject is the page they read, named with that page. */
export const PAGE_NAMES: Readonly<Record<string, MessageKey>> = {
  recentPlaysPage: "pipelines.op.recentPlaysPage",
};

/** A score read's name, from its subject: a genre's list, or a chart as `songNo/level`. */
function scoreReadName(i18n: Translator, operation: string, subject: string): string | null {
  const [song = "", level = ""] = subject.split("/");
  const genre = Number(subject);
  if (operation === "scoreList" && Object.hasOwn(GENRE_LABEL, genre)) {
    return i18n.t("pipelines.op.scoreList", { genre: i18n.t(GENRE_LABEL[genre as Genre]) });
  }
  if (operation === "scoreDetail" && Object.hasOwn(LEVEL_DIFFICULTY, level)) {
    const difficulty = LEVEL_DIFFICULTY[Number(level) as Level];
    return i18n.t("pipelines.op.scoreDetail", {
      song,
      difficulty: i18n.t(DIFFICULTY_LABEL[difficulty]),
    });
  }
  return null;
}

/** A group's name: its picture, the page a walk read, the score it read, or its operation. */
export function groupName(
  i18n: Translator,
  group: { readonly operation: string; readonly subject?: string },
): string {
  const { subject } = group;
  const pageKey = Object.hasOwn(PAGE_NAMES, group.operation)
    ? PAGE_NAMES[group.operation]
    : undefined;
  if (subject !== undefined && pageKey !== undefined) {
    return i18n.t(pageKey, { page: subject });
  }
  const scoreRead = subject === undefined ? null : scoreReadName(i18n, group.operation, subject);
  if (scoreRead !== null) {
    return scoreRead;
  }
  const key =
    subject !== undefined && Object.hasOwn(PICTURE_NAMES, subject)
      ? PICTURE_NAMES[subject]
      : undefined;
  return key === undefined ? operationName(i18n, group.operation) : i18n.t(key);
}
