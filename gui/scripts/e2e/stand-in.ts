/** What the stand-in was asked, and the switches that steer its answers. */

import {
  COSTUME_FIELDS,
  type CostumeState,
  INITIAL_COSTUME,
  type PostRecord,
} from "../mock-costume";
import { crownIconPng, rankIconPng } from "../mock-pictures";
import { INITIAL_PROFILE, OWNED_TITLES } from "../mock-profile";
import { DAN_LABEL, HIROBA, MEDAL_PLATE, MY_PAGE, PANEL_ART } from "./config";
import { same, waitFor } from "./harness";

const APP_FIELD: Readonly<Record<(typeof COSTUME_FIELDS)[number], string>> = {
  color_body: "colorBody",
  color_limb: "colorLimb",
  color_face: "colorFace",
  costume_1: "costume1",
  costume_2: "costume2",
  costume_3: "costume3",
  costume_4: "costume4",
  costume_5: "costume5",
};
const asAppSet = (state: CostumeState) =>
  Object.fromEntries(COSTUME_FIELDS.map((field) => [APP_FIELD[field], state[field]]));
export const START = asAppSet(INITIAL_COSTUME);

export const hitsOn = async (path: string) =>
  Number(await (await fetch(`${HIROBA}/__hits?path=${path}`)).text());
export const myPageHits = () => hitsOn(MY_PAGE);
export const readHits = async () => (await hitsOn(MY_PAGE)) + (await hitsOn(DAN_LABEL));

export const savedCostume = async () =>
  asAppSet((await (await fetch(`${HIROBA}/__state`)).json()) as CostumeState);
export const PREVIEW = "GET /imgsrc_mydon.php";
export const THUMBNAIL = "GET /imgsrc_kisekae.php";
const TITLE_PLATE = "GET /imgsrc_titleplate.php";
const TOKEN_PLATE = `GET ${MEDAL_PLATE}`;
const MY_DON = "GET /imgsrc.php";

/** Each legend item's icon: the image number its path carries, then the stand-in's own picture. */
export const LEGEND_ICONS: Readonly<Record<string, readonly [path: string, picture: Uint8Array]>> =
  {
    "rank-2": ["/image/sp/640/best_score_rank_2_640.png", rankIconPng(2)],
    "rank-3": ["/image/sp/640/best_score_rank_3_640.png", rankIconPng(3)],
    "rank-4": ["/image/sp/640/best_score_rank_4_640.png", rankIconPng(4)],
    "rank-5": ["/image/sp/640/best_score_rank_5_640.png", rankIconPng(5)],
    "rank-6": ["/image/sp/640/best_score_rank_6_640.png", rankIconPng(6)],
    "rank-7": ["/image/sp/640/best_score_rank_7_640.png", rankIconPng(7)],
    "rank-8": ["/image/sp/640/best_score_rank_8_640.png", rankIconPng(8)],
    // Gold is crown_02 and silver crown_03: the recent-plays numbering.
    "crowns-silver": ["/image/sp/640/crown_03_640.png", crownIconPng(3)],
    "crowns-gold": ["/image/sp/640/crown_02_640.png", crownIconPng(2)],
    "crowns-donderful": ["/image/sp/640/crown_04_640.png", crownIconPng(4)],
  };
export const ICON_PATHS = Object.values(LEGEND_ICONS).map(([path]) => path);
export const iconHits = async () => {
  const hits = await Promise.all(ICON_PATHS.map((path) => hitsOn(path)));
  return hits.reduce((sum, count) => sum + count, 0);
};

/** Pictures the window asks for by itself as they come on screen, outside any write. */
export const LANE_PICTURES: readonly string[] = [
  THUMBNAIL,
  TITLE_PLATE,
  `GET ${PANEL_ART}`,
  TOKEN_PLATE,
  MY_DON,
  ...ICON_PATHS.map((path) => `GET ${path}`),
];
export const iconsSettled = async () => {
  let last = -1;
  for (let tries = 0; tries < 30; tries++) {
    const now = await iconHits();
    if (now === last) {
      break;
    }
    last = now;
    await Bun.sleep(1000);
  }
  return last;
};
export const medalPlatesSettled = async () => {
  let last = -1;
  for (let tries = 0; tries < 30; tries++) {
    const now = await hitsOn(MEDAL_PLATE);
    if (now === last) {
      break;
    }
    last = now;
    await Bun.sleep(1000);
  }
  return last;
};

export const requestLog = async () => (await (await fetch(`${HIROBA}/__log`)).json()) as string[];

/** Main queues pictures with the writes: one lands before or after a write, never inside it. */
export const sentAsPlanned = (log: string[], before: string[], run: string[]) => {
  const planned = log.flatMap((line, index) =>
    line === PREVIEW || LANE_PICTURES.includes(line) ? [] : [index],
  );
  return (
    same(
      planned.map((index) => log[index]),
      [...before, ...run],
    ) && (planned[planned.length - 1] ?? 0) - (planned[before.length] ?? 0) === run.length - 1
  );
};

export type PlateAsked = { query: string; referer: string | null; session: boolean };
export const platesAsked = async () =>
  (await (await fetch(`${HIROBA}/__titleplates`)).json()) as PlateAsked[];
export const platesSettled = async () => {
  let last = -1;
  for (let tries = 0; tries < 30; tries++) {
    const now = (await platesAsked()).length;
    if (now === last) {
      break;
    }
    last = now;
    await Bun.sleep(1000);
  }
  return platesAsked();
};
type PortraitAsked = { query: string; referer: string | null; cookies: string[] };
export const myDonsAsked = async () =>
  (await (await fetch(`${HIROBA}/__mydons`)).json()) as PortraitAsked[];
export const myDonsSettled = async () => {
  let last = -1;
  for (let tries = 0; tries < 30; tries++) {
    const now = (await myDonsAsked()).length;
    if (now === last) {
      break;
    }
    last = now;
    await Bun.sleep(1000);
  }
  return last;
};
export const askedAsMyPage = (plates: PlateAsked[]) =>
  plates.every(
    (plate) => plate.query === "" && plate.referer === `${HIROBA}/mypage_top.php` && plate.session,
  );
export const previewQueries = async () =>
  (await (await fetch(`${HIROBA}/__previews`)).json()) as string[];
export const previewQuery = (set: Record<string, number>) =>
  [
    ["face", "colorFace"],
    ["body", "colorBody"],
    ["limb", "colorLimb"],
    ["cos1", "costume1"],
    ["cos2", "costume2"],
    ["cos3", "costume3"],
    ["cos4", "costume4"],
    ["cos5", "costume5"],
  ]
    .map(([name, part]) => `${name}=${set[part as string]}`)
    .join("&");
export const resetLog = () => fetch(`${HIROBA}/__log-reset`);

export const sameBesideLanePictures = (log: string[], expected: string[]) => {
  const kept = log.flatMap((line, index) => (LANE_PICTURES.includes(line) ? [] : [index]));
  const inside =
    kept.length === 0 ? 0 : (kept[kept.length - 1] ?? 0) - (kept[0] ?? 0) + 1 - kept.length;
  return (
    same(
      kept.map((index) => log[index]),
      expected,
    ) && inside <= 0
  );
};

/** `run` first and whole, then each of `reads` in its own order, however they interleave. */
export const runThenReadsBesideLanePictures = (log: string[], run: string[], reads: string[][]) => {
  const start = log.findIndex((line) => !LANE_PICTURES.includes(line));
  if (start < 0 || !same(log.slice(start, start + run.length), run)) {
    return false;
  }
  const waiting = reads.map((requests) => [...requests]);
  for (const line of log.slice(start + run.length)) {
    if (LANE_PICTURES.includes(line)) {
      continue;
    }
    const next = waiting.find((requests) => requests[0] === line);
    if (next === undefined) {
      return false;
    }
    next.shift();
  }
  return waiting.every((requests) => requests.length === 0);
};

// The desktop's costume writes are live-checked, so no other page is read around them.
export const COLOUR_REQUESTS = [
  "GET /mypage_kisekae.php",
  "POST /ajax/check_ip_kisekae.php",
  "POST /ajax/change_mydon.php",
  "GET /mypage_kisekae.php",
];

const EDITOR = "/mypage_kisekae.php";
export const editorHits = () => hitsOn(EDITOR);

export type Thumb = { cos: number; type: number; referer: string | null };
export const thumbs = async () => (await (await fetch(`${HIROBA}/__thumbs`)).json()) as Thumb[];
export const thumbsSettled = async () => {
  let last = -1;
  for (let tries = 0; tries < 30; tries++) {
    const now = (await thumbs()).length;
    if (now === last) {
      break;
    }
    last = now;
    await Bun.sleep(1000);
  }
  return thumbs();
};

export const TITLE_PAGE = "/mypage_title_edit.php";
export const TITLE_REQUESTS = [
  "GET /mypage_kisekae.php",
  "GET /mypage_title_edit.php",
  "POST /ajax/check_ip_title.php",
  "POST /ajax/change_mydon_profile.php",
  "GET /mypage_top.php",
  "GET /mypage_kisekae.php",
];
export const NAME_REQUESTS = [
  "GET /mypage_top.php",
  "GET /mypage_top.php",
  "POST /ajax/change_mydon_profile.php",
  "GET /mypage_top.php",
  "GET /mypage_top.php",
];
export const TITLE_REREAD = ["GET /mypage_top.php", `GET ${DAN_LABEL}`];
const isPicture = (line: string) => line === PREVIEW || LANE_PICTURES.includes(line);
/** Whether `log` is `run` with no picture inside it, then `after`, pictures aside. */
export const runThen = (log: string[], run: string[], after: string[]) => {
  const kept = log.filter((line) => !isPicture(line));
  const endOfRun = log.findIndex(
    (_, index) => log.slice(0, index + 1).filter((line) => !isPicture(line)).length === run.length,
  );
  return (
    same(kept, [...run, ...after]) &&
    endOfRun !== -1 &&
    sentAsPlanned(log.slice(0, endOfRun + 1), [], run)
  );
};
export const requestsSettled = async (count: number) => {
  await waitFor(`${count} requests`, async () =>
    (await requestLog()).filter((line) => !isPicture(line)).length >= count ? true : undefined,
  );
  await Bun.sleep(400);
  return requestLog();
};
export const titleOf = (id: number) => {
  const found = OWNED_TITLES.find((one) => one.id === id);
  if (found === undefined) {
    throw new Error(`The mock owns no title ${id}`);
  }
  return found;
};

export const profileNow = async () =>
  (await (await fetch(`${HIROBA}/__profile`)).json()) as { title: string; nickname: string };
export const profileAsStarted = {
  title: INITIAL_PROFILE.title,
  nickname: INITIAL_PROFILE.nickname,
};
export const profilePosts = async () =>
  (await (await fetch(`${HIROBA}/__profile-posts`)).json()) as PostRecord[];
export const profileSaves = async () =>
  (await profilePosts()).filter((post) => post.path === "/ajax/change_mydon_profile.php");
export const AJAX_HEADERS = (referer: string) => (post: PostRecord) =>
  post.xRequestedWith === "XMLHttpRequest" &&
  post.origin === HIROBA &&
  post.referer === `${HIROBA}${referer}` &&
  post.contentType === "application/x-www-form-urlencoded; charset=UTF-8";
