import {
  type Difficulty,
  isRecord,
  type MedalProgress,
  type PlayOptionCode,
  type Profile,
  type ScoreRank,
} from "@abth/core";

import { type CrownKind, isWhole } from "../shared/session-port";
import type { HirobaEndpoints } from "./types";

export const TITLE_PLATE_PATH = "/imgsrc_titleplate.php";
export const scorePanelPath = (level: number): string =>
  `/image/sp/640/total_score_image_${level}.png`;
export const rankIconPath = (rank: ScoreRank): string =>
  `/image/sp/640/best_score_rank_${rank}_640.png`;
// The recent-plays page's numbering, not the detail page's: there gold is 02 and silver is 03.
const CROWN_ICON_NUMBER: Readonly<Record<CrownKind, number>> = { gold: 2, silver: 3, donderful: 4 };
export const crownIconPath = (crown: CrownKind): string =>
  `/image/sp/640/crown_0${CROWN_ICON_NUMBER[crown]}_640.png`;
const COURSE_ICON_NUMBER: Readonly<Record<Difficulty, number>> = {
  easy: 1,
  normal: 2,
  hard: 3,
  oni: 4,
  ura: 5,
};
export const courseIconPath = (difficulty: Difficulty): string =>
  `/image/sp/640/icon_course02_${COURSE_ICON_NUMBER[difficulty]}_640.png`;
export const optionIconPath = (option: PlayOptionCode): string =>
  `/image/sp/640/status_10_${option}_640.png`;
const PANEL_LEVEL_LEAST = 1;
const PANEL_LEVEL_MOST = 99;
export const MEDAL_PLATE_PATH = "/imgsrc_tokenplate.php";
const MEDAL_PLATE_QUERY = /^\?id=([0-9a-f]{16,128})$/;
/** Where the picture host draws a player's My Don portrait, off Hiroba. */
export const MY_DON_PATH = "/imgsrc.php";
const MY_DON_QUERY = /^\?v=([\w.-]{0,32})&kind=mydon&fn=mydon_\d+$/;

/** Why there is no source: the page showed none, or it failed its pattern, never corrected. */
export type NoPictureSource = "notShown" | "unexpectedSrc";

const NO_SOURCE = { notShown: true, unexpectedSrc: true } as const satisfies Record<
  NoPictureSource,
  true
>;
const isNoSource = (value: string): value is NoPictureSource => Object.hasOwn(NO_SOURCE, value);

export interface TitlePlateSource {
  /** `bare` is the plate of whoever holds the session; `byTaikoNo` names the page's own taiko
   * number and needs no session. */
  readonly form: "bare" | "byTaikoNo";
  /** The title drawn over the plate, "" for none: in the key, so a changed title is a new plate. */
  readonly title: string;
}

/** The score panel my page shows, by the level its art is named for: all of its address that
 * varies. The art shows no count, so it names no player. */
export interface ScorePanelSource {
  readonly level: number;
}

/** The どんメダル plate as my page asked for it. Public, but its id names the player's season:
 * identity data like the taiko number, so it stays with the platform. */
export interface MedalPlateSource {
  /** The id in the plate's query, as my page wrote it: a new season is a new id. */
  readonly id: string;
  /** Where the season stood over the plate: in the key, as the art may change once the set is
   * complete (unverified). */
  readonly progress: MedalProgress["kind"];
}

/** The My Don portrait as my page asked for it, on the picture host. Its taiko number stays with
 * the platform: only `v` is kept here. */
export interface MyDonSource {
  readonly v: string;
}

/** What the platform keeps of the last my page it read, to fetch its pictures, each checked against
 * a strict pattern. It goes with the session and never reaches the window. */
export interface PictureSources {
  readonly titlePlate: TitlePlateSource | NoPictureSource;
  /** Never `notShown`: a page with no score panel does not read at all. */
  readonly scorePanel: ScorePanelSource | NoPictureSource;
  /** `notShown` too when the page shows no どんメダル plate at all. */
  readonly medalPlate: MedalPlateSource | NoPictureSource;
  /** `unexpectedSrc` too when there is no picture host to hold it to. */
  readonly myDon: MyDonSource | NoPictureSource;
}

/** The sources of the pictures `profile`'s page showed, each checked again here whatever the parser
 * kept: exactly one of the known forms against Hiroba's origin, or `unexpectedSrc`. */
export function pictureSourcesOf(profile: Profile, endpoints: HirobaEndpoints): PictureSources {
  return {
    titlePlate: titlePlateOf(profile, endpoints),
    scorePanel: scorePanelOf(profile),
    medalPlate: medalPlateOf(profile, endpoints),
    myDon: myDonOf(profile, endpoints),
  };
}

/** The sources a kept read holds: never the どんメダル plate, whose id stays off the disk. */
export type KeptPictureSources = Omit<PictureSources, "medalPlate">;

export function keptSourcesOf({
  titlePlate,
  scorePanel,
  myDon,
}: PictureSources): KeptPictureSources {
  return { titlePlate, scorePanel, myDon };
}

/** Kept sources, each held to the pattern a page's is read with; null for anything else. */
export function keptSourcesIn(value: unknown): KeptPictureSources | null {
  if (!isRecord(value)) {
    return null;
  }

  const titlePlate = keptSourceIn(value.titlePlate, titlePlateIn);
  const scorePanel = keptSourceIn(value.scorePanel, scorePanelIn);
  const myDon = keptSourceIn(value.myDon, myDonIn);
  return titlePlate === null || scorePanel === null || myDon === null
    ? null
    : { titlePlate, scorePanel, myDon };
}

function keptSourceIn<S>(
  value: unknown,
  sourceIn: (kept: Record<string, unknown>) => S | null,
): S | NoPictureSource | null {
  if (typeof value === "string") {
    return isNoSource(value) ? value : null;
  }
  return isRecord(value) ? sourceIn(value) : null;
}

const titlePlateIn = ({ form, title }: Record<string, unknown>): TitlePlateSource | null =>
  (form === "bare" || form === "byTaikoNo") && typeof title === "string" ? { form, title } : null;

const scorePanelIn = ({ level }: Record<string, unknown>): ScorePanelSource | null =>
  isWhole(level, PANEL_LEVEL_LEAST, PANEL_LEVEL_MOST) ? { level } : null;

const myDonIn = ({ v }: Record<string, unknown>): MyDonSource | null =>
  typeof v === "string" && MY_DON_QUERY.test(`?v=${v}&kind=mydon&fn=mydon_0`) ? { v } : null;

function scorePanelOf(profile: Profile): ScorePanelSource | NoPictureSource {
  const level = profile.summary.countLevel;
  return isWhole(level, PANEL_LEVEL_LEAST, PANEL_LEVEL_MOST) ? { level } : "unexpectedSrc";
}

function myDonOf(profile: Profile, endpoints: HirobaEndpoints): MyDonSource | NoPictureSource {
  const src = profile.myDonImageUrl;
  if (src === null) {
    return "notShown";
  }
  if (endpoints.imgOrigin === null) {
    return "unexpectedSrc";
  }
  let asked: URL;
  let path: string;
  try {
    asked = new URL(src, `${endpoints.hirobaOrigin}/`);
    path = new URL(MY_DON_PATH, endpoints.imgOrigin).href;
  } catch {
    return "unexpectedSrc";
  }
  const v = MY_DON_QUERY.exec(asked.search)?.[1];
  if (v === undefined || asked.href !== `${path}?v=${v}&kind=mydon&fn=mydon_${profile.taikoNo}`) {
    return "unexpectedSrc";
  }
  return { v };
}

function medalPlateOf(
  profile: Profile,
  endpoints: HirobaEndpoints,
): MedalPlateSource | NoPictureSource {
  const { medal } = profile;
  if (medal === null || medal.plateImageUrl === null) {
    return "notShown";
  }
  let asked: URL;
  let path: string;
  try {
    asked = new URL(medal.plateImageUrl, `${endpoints.hirobaOrigin}/`);
    path = new URL(MEDAL_PLATE_PATH, endpoints.hirobaOrigin).href;
  } catch {
    return "unexpectedSrc";
  }
  const id = MEDAL_PLATE_QUERY.exec(asked.search)?.[1];
  if (id === undefined || asked.href !== `${path}?id=${id}`) {
    return "unexpectedSrc";
  }
  return { id, progress: medal.progress.kind };
}

function titlePlateOf(
  profile: Profile,
  endpoints: HirobaEndpoints,
): TitlePlateSource | NoPictureSource {
  const src = profile.titlePlateImageUrl;
  if (src === null) {
    return "notShown";
  }
  let asked: string;
  let bare: string;
  try {
    asked = new URL(src, `${endpoints.hirobaOrigin}/`).href;
    bare = new URL(TITLE_PLATE_PATH, endpoints.hirobaOrigin).href;
  } catch {
    return "unexpectedSrc";
  }
  if (asked === bare) {
    return { form: "bare", title: profile.title };
  }
  if (asked === `${bare}?taiko_no=${profile.taikoNo}`) {
    return { form: "byTaikoNo", title: profile.title };
  }
  return "unexpectedSrc";
}
