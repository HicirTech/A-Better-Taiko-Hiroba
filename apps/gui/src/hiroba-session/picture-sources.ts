import type { MedalProgress, Profile } from "@abth/core";

import type { HirobaEndpoints } from "./types";

/** Where my page's title plate lives: bare on every capture, `?taiko_no=` on other pages. */
export const TITLE_PLATE_PATH = "/imgsrc_titleplate.php";
/** Where my page's どんメダル plate lives: `?id=` and the plate's id, the only query. */
export const MEDAL_PLATE_PATH = "/imgsrc_tokenplate.php";
/** The query of the plate my page asks for: lowercase hex, 48 digits on every capture. */
const MEDAL_PLATE_QUERY = /^\?id=([0-9a-f]{16,128})$/;
/** Where the picture host draws a player's My Don portrait, off Hiroba. */
export const MY_DON_PATH = "/imgsrc.php";
/**
 * The query of the portrait my page shows, in its order: a short `v`, empty on all 331 tags
 * captured, then the kind and whose portrait, by taiko number (wiki: Page Map).
 */
const MY_DON_QUERY = /^\?v=([\w.-]{0,32})&kind=mydon&fn=mydon_\d+$/;

/**
 * Why the platform holds no source for one of my page's pictures: the page showed none, or the one
 * it showed failed its pattern. A source that fails is never corrected into one that passes.
 */
export type NoPictureSource = "notShown" | "unexpectedSrc";

/** The title plate as my page asked for it, and the title it drew over it. */
export interface TitlePlateSource {
  /**
   * `bare`: `imgsrc_titleplate.php` and nothing more, the plate of whoever holds the session, as my
   * page writes it. `byTaikoNo`: the only query `taiko_no`, the page's own taiko number, a form that
   * needs no session.
   */
  readonly form: "bare" | "byTaikoNo";
  /**
   * The title my page shows over the plate, "" for none: part of what the plate is kept under, so a
   * title changed anywhere is a new plate.
   */
  readonly title: string;
}

/**
 * The どんメダル plate as my page asked for it, and where the season stood on it. Public, and the
 * same with a session or without one (wiki: Page Map), but its id names the player's season: it is
 * identity data, like the taiko number, and stays with the platform.
 */
export interface MedalPlateSource {
  /** The id in the plate's query, as my page wrote it: a new season is a new id. */
  readonly id: string;
  /**
   * Where the season stood, as my page wrote it over the plate: part of what the plate is kept
   * under, as its art may change once the set is complete (unverified).
   */
  readonly progress: MedalProgress["kind"];
}

/**
 * The My Don portrait as my page asked for it, on the picture host off Hiroba. Public, and keyed by
 * the page's own taiko number, which stays with the platform as ever: only `v` is kept here.
 */
export interface MyDonSource {
  /** The query's `v`, as my page wrote it: empty on every capture. */
  readonly v: string;
}

/**
 * What the platform keeps of the last my page it read, to fetch the pictures that page showed:
 * each one's source, checked here against a strict pattern, or why there is none. It stays with
 * the platform, beside whose page it was, goes with the session, and never reaches the window.
 * Each picture of my page adds its field here with the part of the app that shows it.
 */
export interface PictureSources {
  readonly titlePlate: TitlePlateSource | NoPictureSource;
  /** `notShown` too when the page shows no どんメダル plate at all. */
  readonly medalPlate: MedalPlateSource | NoPictureSource;
  /** `unexpectedSrc` too when there is no picture host to hold it to. */
  readonly myDon: MyDonSource | NoPictureSource;
}

/**
 * The sources of the pictures `profile`'s page showed, each checked again here, whatever the parser
 * kept: a source is resolved against Hiroba's origin and must be exactly one of the forms named
 * above, or it is `unexpectedSrc`.
 */
export function pictureSourcesOf(profile: Profile, endpoints: HirobaEndpoints): PictureSources {
  return {
    titlePlate: titlePlateOf(profile, endpoints),
    medalPlate: medalPlateOf(profile, endpoints),
    myDon: myDonOf(profile, endpoints),
  };
}

/**
 * The portrait's source: exactly the picture host's `imgsrc.php`, with my page's query naming the
 * page's own taiko number, and nothing else.
 */
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
