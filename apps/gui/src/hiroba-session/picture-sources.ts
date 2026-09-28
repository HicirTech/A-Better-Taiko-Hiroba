import type { Profile } from "@abth/core";

import type { HirobaEndpoints } from "./types";

/** Where my page's title plate lives: bare on every capture, `?taiko_no=` on other pages. */
export const TITLE_PLATE_PATH = "/imgsrc_titleplate.php";

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
 * What the platform keeps of the last my page it read, to fetch the pictures that page showed:
 * each one's source, checked here against a strict pattern, or why there is none. It stays with
 * the platform, beside whose page it was, goes with the session, and never reaches the window.
 * Each picture of my page adds its field here with the part of the app that shows it.
 */
export interface PictureSources {
  readonly titlePlate: TitlePlateSource | NoPictureSource;
}

/**
 * The sources of the pictures `profile`'s page showed, each checked again here, whatever the parser
 * kept: a source is resolved against Hiroba's origin and must be exactly one of the forms named
 * above, or it is `unexpectedSrc`.
 */
export function pictureSourcesOf(profile: Profile, endpoints: HirobaEndpoints): PictureSources {
  return { titlePlate: titlePlateOf(profile, endpoints) };
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
