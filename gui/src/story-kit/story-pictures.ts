/** The pictures stories draw: the pack's where it has them, else the e2e's stand-ins. */
import { err, ok } from "@abth/core";

import {
  courseIconPng,
  crownIconPng,
  medalPlatePng,
  myDonPng,
  optionIconPng,
  rankIconPng,
  scorePanelPng,
  thumbnailPng,
  titlePlatePng,
} from "../../scripts/mock-pictures";
import {
  createPictureLane,
  type PictureAnswer,
  type PictureLane,
  type PictureLaneOptions,
  wantKey,
} from "../pictures/picture-lane";
import { IO_READ_CONSUMERS } from "../pipelines";
import type { CrownKind, PictureView, PictureWant } from "../session-port";
import { DIFFICULTIES } from "../song-catalogue/types";
import { packView } from "./pack";
import { pictureOf } from "./picture-of";
import { STORY_PROFILE, STORY_SET } from "./profile";

const CROWN_NUMBER: Readonly<Record<CrownKind, number>> = { gold: 2, silver: 3, donderful: 4 };
const MEDAL_PLATE_ID = "story-season";

function standInBytes(want: PictureWant): Uint8Array {
  switch (want.kind) {
    case "costumeItem":
      return thumbnailPng(want.slot, want.id);
    case "titlePlate":
      return titlePlatePng(STORY_PROFILE.title);
    case "scorePanel":
      return scorePanelPng(STORY_PROFILE.panel.countLevel);
    case "medalPlate":
      return medalPlatePng(MEDAL_PLATE_ID, false);
    case "myDon":
      return myDonPng(Object.values(STORY_SET));
    case "rankIcon":
      return rankIconPng(want.rank);
    case "crownIcon":
      return crownIconPng(CROWN_NUMBER[want.crown]);
    case "courseIcon":
      return courseIconPng(DIFFICULTIES.indexOf(want.difficulty) + 1);
    case "optionIcon":
      return optionIconPng(want.option);
  }
}

/** The picture for `want`, as it crosses to the window. */
export const storyView = (want: PictureWant): PictureView =>
  packView(wantKey(want)) ?? pictureOf(standInBytes(want));

/** The picture as a lane answers it, for parts that are handed their answer. */
export const storyAnswer = (want: PictureWant): PictureAnswer => ({ view: storyView(want) });

const laneOf = (load: PictureLaneOptions["load"]): PictureLane =>
  createPictureLane({ load, atOnce: IO_READ_CONSUMERS, dwellMs: 0 });

/** Every picture comes at once. */
export const STORY_LANE = laneOf((want) => Promise.resolve(ok(storyView(want))));

/** No picture ever comes: the room each keeps while it is on its way. */
export const WAITING_LANE = laneOf(() => new Promise(() => {}));

/** Every picture fails, as when Hiroba answers with a page in place of a picture. */
export const FAILING_LANE = laneOf((want) =>
  Promise.resolve(err({ code: `${want.kind}=notPng status=200 type=text/html bytes=512` })),
);
