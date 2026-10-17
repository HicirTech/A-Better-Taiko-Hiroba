import { danLabelPng } from "../../scripts/mock-dan-label";
import type { CostumeSet, PictureView, ProfileView } from "../session-port";
import { packData, packView } from "./pack";
import { pictureOf } from "./picture-of";

/** A dan's label as my page shows it: the pack's, else the stand-in's. */
export const danLabelView = (board: number): PictureView =>
  packView(`danLabel/${board}`) ?? pictureOf(danLabelPng(board));

/** A made-up costume: every value is one Hiroba could hold. */
export const STORY_SET: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

/** A made-up player, as my page shows them. */
export const STORY_PROFILE: ProfileView = {
  nickname: "サンプルどん",
  title: "サンプルの称号",
  rename: "open",
  region: null,
  dan: { board: 10, picture: danLabelView(10) },
  crowns: { silver: 214, gold: 87, donderful: 9 },
  panel: { countLevel: 5, ranks: { 2: 41, 3: 37, 4: 52, 5: 66, 6: 29, 7: 12, 8: 3 } },
  medal: { name: "どんメダル2026秋", progress: { kind: "collecting", count: 12 } },
  favoriteSong: "夜明けのスケッチ",
  favoriteFolder: ["夜明けのスケッチ", "約束の向こう側"],
  fetchedAt: "2026-10-17T09:30:12.000Z",
};

const packProfile = packData("profile");

/** The player a whole page reads: the resource pack's, with the made-up player's dan as the pages
 * do not name it, else the made-up player. */
export const PAGE_PROFILE: ProfileView =
  packProfile === null ? STORY_PROFILE : { ...packProfile, dan: STORY_PROFILE.dan };
