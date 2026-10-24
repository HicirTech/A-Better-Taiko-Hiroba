import { join } from "node:path";
import { createTranslator } from "@abth/i18n";

export const root = join(import.meta.dir, "..", "..");

/** Set by a run with lanes in each lane's process, to that lane's index. */
export const LANE_VARIABLE = "ABTH_E2E_LANE";
/** Which lane of a run this process is: each lane has its own stand-in, ports and folders. */
export const LANE = Number(process.env[LANE_VARIABLE] ?? "0");
const PORT_STEP = 10;

// The dev run's stand-in takes 8807 and 8808, and may be running beside a run.
export const HIROBA_PORT = 8907 + LANE * PORT_STEP;
export const IDP_PORT = 8908 + LANE * PORT_STEP;
export const HIROBA = `http://hiroba.127.0.0.1.sslip.io:${HIROBA_PORT}`;
export const CDP_PORT = 9333 + LANE * PORT_STEP;
export const IDP_HOST = `id.127.0.0.1.sslip.io:${IDP_PORT}`;
/** The stand-in's picture host: outside Hiroba's cookie Domain. */
export const IMG = `http://img.127.0.0.1.sslip.io:${HIROBA_PORT}`;
/** The stand-in for a service that refuses to sign in inside an app. */
export const REFUSING_HOST = `refuses.127.0.0.1.sslip.io:${IDP_PORT}`;
/** A sign-in page that is not on https. */
export const OFFSITE_HOST = `offsite.127.0.0.1.sslip.io:${IDP_PORT}`;
export const IDP_MARKER = "abth-mock-idp-marker";
export const MY_PAGE = "/mypage_top.php";
/** The stand-in's rating data. */
export const RATING_DATA = "/__rating-data";
export const DAN_LABEL = "/imgsrc_danlabel.php";
export const MEDAL_PLATE = "/imgsrc_tokenplate.php";
export const PANEL_ART = "/image/sp/640/total_score_image_5.png";
/** The app's data folder of a lane; lane 0's keeps the name a run without lanes uses. */
export const userDataOf = (lane: number, name = "e2e-user-data") =>
  join(root, "out", lane === 0 ? name : `${name}-lane${lane}`);
export const USER_DATA = userDataOf(LANE);
/** Its own folder: a language picked there must not reach the runs that read English. */
export const LANGUAGE_USER_DATA = userDataOf(LANE, "e2e-user-data-language");
export const UPDATES_USER_DATA = userDataOf(LANE, "e2e-user-data-updates");
export const PAGE_GONE_USER_DATA = userDataOf(LANE, "e2e-user-data-page-gone");
export const UPDATE_FEED = "/__update-feed/update.json";
/** MUI's md: from this width the app frame shows its side panel. */
export const MD_WIDTH_PX = 900;
/** The page size every app is held to: a display that sleeps or goes resizes windows, not pages. */
export const PAGE_SIZE = { width: 946, height: 738 } as const;
export const PHONE = { width: 480, height: 800 } as const;
export const PHONE_TALL = { width: 390, height: 844 } as const;
export const PHONE_SHORT = { width: 390, height: 600 } as const;
/** The app frame's top band: what stays in view sticks just below it. */
export const TOP_BAND_PX = 64;
export const NOON_JST = "2026-09-27T03:00:00Z";
export const IN_THE_BREAK = "2026-09-26T20:30:00Z";

export const SESSION_FILE = join(USER_DATA, "session.json");

export const en = createTranslator("en");
export const ja = createTranslator("ja");
export const zhHant = createTranslator("zh-Hant");

// How a read failure's notice gives its code; a picture that did not come gives none.
export const REPORT_CODE = en.t("failure.code", { code: "" }).trim();
