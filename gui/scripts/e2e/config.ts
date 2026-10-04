import { join } from "node:path";
import { createTranslator } from "@abth/i18n";

export const root = join(import.meta.dir, "..", "..");

export const HIROBA = "http://hiroba.127.0.0.1.sslip.io:8807";
export const CDP_PORT = 9333;
export const IDP_HOST = "id.127.0.0.1.sslip.io:8808";
/** The stand-in's picture host: outside Hiroba's cookie Domain. */
export const IMG = "http://img.127.0.0.1.sslip.io:8807";
export const IDP_MARKER = "abth-mock-idp-marker";
export const MY_PAGE = "/mypage_top.php";
export const DAN_LABEL = "/imgsrc_danlabel.php";
export const MEDAL_PLATE = "/imgsrc_tokenplate.php";
export const PANEL_ART = "/image/sp/640/total_score_image_5.png";
export const USER_DATA = join(root, "out", "e2e-user-data");
/** Its own folder: a language picked there must not reach the runs that read English. */
export const LANGUAGE_USER_DATA = join(root, "out", "e2e-user-data-language");
export const UPDATES_USER_DATA = join(root, "out", "e2e-user-data-updates");
export const UPDATE_FEED = "/__update-feed/update.json";
/** MUI's md: from this width the app frame shows its side panel. */
export const MD_WIDTH_PX = 900;
export const PHONE = { width: 480, height: 800 } as const;
export const PHONE_TALL = { width: 390, height: 844 } as const;
export const PHONE_SHORT = { width: 390, height: 600 } as const;
/** The app frame's top band: what stays in view sticks just below it. */
export const TOP_BAND_PX = 64;
export const NOON_JST = "2026-09-27T03:00:00Z";
export const IN_THE_BREAK = "2026-09-26T20:30:00Z";

export const SESSION_FILE = join(USER_DATA, "session.json");

export const MY_DON_GIF_CODE = "Code for a report: myDon=notPng status=200 type=image/gif bytes=43";

export const en = createTranslator("en");
export const ja = createTranslator("ja");
export const zhHant = createTranslator("zh-Hant");
