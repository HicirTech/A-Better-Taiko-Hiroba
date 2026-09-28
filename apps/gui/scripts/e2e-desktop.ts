/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again, a rotated session,
 * every どんメダル state, a dan-less, title-less, region-less my page, a set favourite song and a
 * filled favourites folder, the identity card on Hiroba's title plate (its text over it, one plate
 * per title, one that does not come, the plate kept across sign-outs and launches), the My Don
 * portrait (from the picture host with no cookie, a first one that does not come coded and asked
 * for again after a read, kept across launches and sign-ins, fetched anew on Read again and after a
 * write applies, the kept one still shown when a fresh one does not come), the どんメダル
 * plate (asked for only on screen, its words over it, one plate per season and state, one that
 * does not come, its id never in the window or on disk, the plate kept across sign-outs and
 * launches), the editor's
 * picture of the set (on opening, after a pick, one request for a burst of picks, one that does not
 * come, none once shut, none inside a write), its items' thumbnails (only those seen, each once,
 * kept across sign-outs and launches, one that does not come, one not offered, shapes the bridge
 * refuses, none inside a write), the pictures on disk named by hashes alone, costume
 * writes (a colour and a きぐるみ, each undone, the #22 trap, a save that moves nothing,
 * pre-checks that stop, a post sent to the login page, an undo after a change made elsewhere, and
 * a session that ends before and after a save), a lost session (none of its pictures shown at the
 * next sign-in), cancel, a sign-in sent off both
 * sites, the language (the system's at first, a pick that takes hold at once and is kept, and one
 * made on the profile, which asks Hiroba nothing), a reopen that keeps the session and the undo,
 * Hiroba's daily break, sign-out, and a reopen that stays signed out with the write gate shut and,
 * signed in, shows the editor's button shut and why, against scripts/mock-hiroba.ts, over the
 * Chrome DevTools Protocol. It counts the reads the mock saw and checks each write sent exactly the requests
 * planned, then searches the app's user-data folder for every session token and form token the
 * mock issued and for what the mock ID host left behind. Run `bun run build` first.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { createTranslator } from "@abth/i18n";
import electronPath from "electron";

import { PICTURE_EPOCH } from "../src/hiroba-session";
import { BRIDGE_CHANNELS } from "../src/session-port";
import { COSTUME_FIELDS, type CostumeState, INITIAL_COSTUME } from "./mock-costume";

const root = join(import.meta.dir, "..");
const HIROBA = "http://hiroba.127.0.0.1.sslip.io:8807";
const CDP_PORT = 9333;
const IDP_HOST = "id.127.0.0.1.sslip.io:8808";
/** The mock's picture host, where the My Don portrait comes from: outside Hiroba's cookie Domain. */
const IMG = "http://img.127.0.0.1.sslip.io:8807";
const IDP_MARKER = "abth-mock-idp-marker";
const MY_PAGE = "/mypage_top.php";
const DAN_LABEL = "/imgsrc_danlabel.php";
const MEDAL_PLATE = "/imgsrc_tokenplate.php";
const USER_DATA = join(root, "out", "e2e-user-data");
/** The language runs' own folder, so a pick made there never reaches the runs that read English. */
const LANGUAGE_USER_DATA = join(root, "out", "e2e-user-data-language");
/** Noon JST, outside Hiroba's daily break, whatever the hour the run is made at. */
const NOON_JST = "2026-09-27T03:00:00Z";
/** 05:30 JST, inside the break. */
const IN_THE_BREAK = "2026-09-26T20:30:00Z";
rmSync(USER_DATA, { recursive: true, force: true });

/** The app's name for each of the mock's costume fields, and the mock's set as the app's. */
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
const START = asAppSet(INITIAL_COSTUME);

const results: Record<string, unknown> = {};

// One override alone must stop the app before it opens a window.
const halfSet = Bun.spawn([String(electronPath), root], {
  env: { ...process.env, ABTH_DEV_HIROBA_ORIGIN: HIROBA, ABTH_DEV_USER_DATA: USER_DATA },
  stdout: "ignore",
  stderr: "ignore",
});
results.halfOverrideRefused = (await Promise.race([halfSet.exited, Bun.sleep(15_000)])) === 1;
halfSet.kill();
rmSync(USER_DATA, { recursive: true, force: true });

const mock = Bun.spawn(["bun", join(root, "scripts", "mock-hiroba.ts")], { stdout: "ignore" });
await Bun.sleep(500);
results.uaGateActive = (await (await fetch(`${HIROBA}${MY_PAGE}`)).text()).includes(
  "recommended browsers",
);
await fetch(`${HIROBA}/__hits-reset`);

const tokens: string[] = [];
const hitsOn = async (path: string) =>
  Number(await (await fetch(`${HIROBA}/__hits?path=${path}`)).text());
const myPageHits = () => hitsOn(MY_PAGE);
/** Every request a read makes: my page, and the dan label when my page shows one. */
const readHits = async () => (await hitsOn(MY_PAGE)) + (await hitsOn(DAN_LABEL));
const SESSION_FILE = join(USER_DATA, "session.json");
/** The mock's saved costume, as the app names its values. */
const savedCostume = async () =>
  asAppSet((await (await fetch(`${HIROBA}/__state`)).json()) as CostumeState);
const PREVIEW = "GET /imgsrc_mydon.php";
const THUMBNAIL = "GET /imgsrc_kisekae.php";
const TITLE_PLATE = "GET /imgsrc_titleplate.php";
const TOKEN_PLATE = `GET ${MEDAL_PLATE}`;
/** The My Don portrait, on the mock's picture host, which logs its requests with Hiroba's. */
const MY_DON = "GET /imgsrc.php";
/**
 * The pictures the window's lane asks for by itself, as they come on screen: the items' thumbnails
 * and, after each read of my page, the title plate, the どんメダル plate and the My Don.
 */
const LANE_PICTURES: readonly string[] = [THUMBNAIL, TITLE_PLATE, TOKEN_PLATE, MY_DON];
/** The どんメダル plates the app fetched this run, once none more has come for a second. */
const medalPlatesSettled = async () => {
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
/** Every どんメダル plate id my page showed this run: the app must keep each in main alone. */
const medalIds: string[] = [];
/** The id of the どんメダル plate the last read of my page showed, off the page the debug copy kept. */
const medalIdShown = () =>
  /imgsrc_tokenplate\.php\?id=([0-9a-f]+)/.exec(
    readFileSync(join(USER_DATA, "debug", "mypage_top.php.html"), "utf8"),
  )?.[1] ?? "";
/** Every request the mock saw since the last reset, as "METHOD /path", in the order they came. */
const requestLog = async () => (await (await fetch(`${HIROBA}/__log`)).json()) as string[];
/**
 * Whether `log` is the requests `before`, then a write's `run` with nothing inside it, and the
 * pictures (of the set, of its items, and my page's plates) anywhere else. The pictures go as the
 * picks pause, as items come on screen and after a read, not in step with a write, but main queues
 * them with the writes: one goes before a write or after it, never between its requests.
 */
const sentAsPlanned = (log: string[], before: string[], run: string[]) => {
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
/** A title plate as the mock saw it asked for. */
type PlateAsked = { query: string; referer: string | null; session: boolean };
/** Every title plate the app asked for this run, in order. */
const platesAsked = async () =>
  (await (await fetch(`${HIROBA}/__titleplates`)).json()) as PlateAsked[];
/**
 * The title plates asked for, once none more has been for a second: after a read, the plate is
 * asked for again, and answered from the plates kept on disk, or fetched when its title is new.
 */
const platesSettled = async () => {
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
/** A My Don portrait as the mock's picture host saw it asked for, with its cookies' names. */
type PortraitAsked = { query: string; referer: string | null; cookies: string[] };
/** Every portrait the app asked for this run, in order. */
const myDonsAsked = async () =>
  (await (await fetch(`${HIROBA}/__mydons`)).json()) as PortraitAsked[];
/** The portraits asked for, once none more has been for a second. */
const myDonsSettled = async () => {
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
/** Each plate asked for as my page asks for it: bare, with my page as the Referer, signed in. */
const askedAsMyPage = (plates: PlateAsked[]) =>
  plates.every(
    (plate) => plate.query === "" && plate.referer === `${HIROBA}/mypage_top.php` && plate.session,
  );
/** The query of every picture of the set the app asked for since the last reset, in order. */
const previewQueries = async () => (await (await fetch(`${HIROBA}/__previews`)).json()) as string[];
/** A set as the preview's query names it: the site's names, in the site's order. */
const previewQuery = (set: Record<string, number>) =>
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
const resetLog = () => fetch(`${HIROBA}/__log-reset`);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
/**
 * Whether `log` is `expected` once the lane's pictures are left out, with none of them inside it: a
 * thumbnail still on its way from an editor just closed, or a plate asked for after a read, may
 * land before a write or after it.
 */
const sameBesideLanePictures = (log: string[], expected: string[]) => {
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
/**
 * The window's HTML with every picture's bytes left out: a PNG's base64 could spell any short
 * string by chance, so the searches below look only at what is not a picture. Only the base64
 * alphabet goes, so an address, a query or a token written after the bytes is still searched.
 */
const withoutPictureBytes = (html: string) =>
  html.replace(/data:image\/png;base64,[A-Za-z0-9+/]*={0,2}/g, "data:image/png;base64,");
// The searches prove something only while this holds: bytes that happen to spell a searched word
// go, and what is planted after them stays.
results.pictureBytesAloneLeftOut =
  withoutPictureBytes(
    `<img src="data:image/png;base64,AAimgsrc000000000000AA==#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`,
  ) === `<img src="data:image/png;base64,#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`;
/**
 * A colour change's requests: the title, then the editor — last before the posts, since my page's
 * forms issue a token too and would void the editor's — the pre-check, one save, the read-backs.
 */
const WRITE_REQUESTS = [
  "GET /mypage_top.php",
  "GET /mypage_kisekae.php",
  "POST /ajax/check_ip_kisekae.php",
  "POST /ajax/change_mydon.php",
  "GET /mypage_kisekae.php",
  "GET /mypage_top.php",
];

// The language, in runs of their own, signed out. Opened on a system in Traditional Chinese, the
// app is in it, and says so to the page; a pick from the app bar, of the language shown or another,
// takes hold at once and is kept for the next launch, which the system's language no longer decides.
const ja = createTranslator("ja");
const zhHant = createTranslator("zh-Hant");
/** What says which language the window is in: `lang`, the title, a button and the picker. */
const languageShown = (page: Awaited<ReturnType<typeof launch>>["page"]) =>
  page.evaluate<Record<string, string | null>>(
    `({ lang: document.documentElement.lang, title: document.title, signIn: document.querySelector("#sign-in")?.textContent ?? null, picker: document.querySelector("#language-picker")?.textContent ?? null })`,
  );
rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
await resetLog();
let inLanguage = await launch({
  writes: false,
  now: NOON_JST,
  lang: "zh-TW",
  userData: LANGUAGE_USER_DATA,
});
try {
  await inLanguage.until(zhHant.t("signIn.action"));
  results.systemLanguageTaken = same(await languageShown(inLanguage.page), {
    lang: "zh-Hant",
    title: "A Better Taiko Hiroba",
    signIn: zhHant.t("signIn.action"),
    picker: "繁體中文",
  });
  // Each language named in its own words and marked with it, in the catalog's order.
  await inLanguage.click("#language-picker");
  const listed = await waitFor(() =>
    inLanguage.page.evaluate<string[][] | undefined>(
      `(() => { const items = [...document.querySelectorAll('[role="menuitem"]')]; return items.length === 0 ? undefined : items.map((item) => [item.lang, item.textContent]); })()`,
    ),
  );
  results.pickerNamesEachLanguage = same(listed, [
    ["en", "English"],
    ["ja", "日本語"],
    ["zh-Hans", "简体中文"],
    ["zh-Hant", "繁體中文"],
  ]);
  // A pick of the language already shown is a pick too: a system in another one no longer decides.
  await inLanguage.click("#language-zh-Hant");
  await stop(inLanguage);
  inLanguage = await launch({
    writes: false,
    now: NOON_JST,
    lang: "en-US",
    userData: LANGUAGE_USER_DATA,
  });
  await waitFor(async () => (await inLanguage.textOf("#sign-in")) ?? undefined);
  results.shownLanguagePickKept = (await languageShown(inLanguage.page)).lang === "zh-Hant";
  await inLanguage.click("#language-picker");
  await waitFor(async () => (await inLanguage.textOf("#language-ja")) ?? undefined);
  await inLanguage.click("#language-ja");
  await inLanguage.until(ja.t("signIn.action"));
  results.pickTakesHold = same(await languageShown(inLanguage.page), {
    lang: "ja",
    title: "A Better Taiko Hiroba",
    signIn: ja.t("signIn.action"),
    picker: "日本語",
  });
  await stop(inLanguage);
  inLanguage = await launch({
    writes: false,
    now: NOON_JST,
    lang: "zh-TW",
    userData: LANGUAGE_USER_DATA,
  });
  await inLanguage.until(ja.t("signIn.action"));
  results.pickKeptAcrossLaunches =
    (await languageShown(inLanguage.page)).lang === "ja" && same(await requestLog(), []);
} finally {
  await stop(inLanguage);
  rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
}

let running = await launch({ writes: true, now: NOON_JST });
try {
  const { page, text, textOf, click, clickButton, until } = running;
  const exists = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await until("Sign in to Hiroba");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );
  // The window gets the port's verbs, each with its channel, and nothing else.
  results.bridgeIsThePortVerbs = same(
    (results.surface as { bridge: string[] }).bridge,
    Object.keys(BRIDGE_CHANNELS),
  );

  // The player's first My Don ever does not come: checked under the plate, below.
  await fetch(`${HIROBA}/__mydon?answer=gif`);
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  results.profileShown = (await textOf("#crowns-silver")) === "11 of 14";
  // The panel drawn as GitHub's "Languages" box (the user's call, 2026-09-28), from the mock's fixed
  // counts: ranks 2 up to 8 at 4, 9, 18, 31, 25, 12 and 3, and crowns 11, 2 and 1. Each legend
  // item is a name, its share of its block and, for screen readers, its count; each part of a bar
  // names its count in its title. The ranks from 白粋 to 虹極, left to right (the user's call,
  // 2026-09-29), the crowns silver, gold and donderful.
  type Share = readonly [name: string, percent: string, count: number];
  const RANK_SHARES: readonly Share[] = [
    ["白粋", "3.9%", 4],
    ["銅粋", "8.8%", 9],
    ["銀粋", "17.6%", 18],
    ["金雅", "30.4%", 31],
    ["桃雅", "24.5%", 25],
    ["紫雅", "11.8%", 12],
    ["虹極", "2.9%", 3],
  ];
  const CROWN_SHARES: readonly Share[] = [
    ["Silver", "78.6%", 11],
    ["Gold", "14.3%", 2],
    ["Donderful", "7.1%", 1],
  ];
  const legendOf = (shares: readonly Share[], total: number) =>
    shares.map(([name, percent, count]) => `${name} ${percent} ${count} of ${total}`);
  const barOf = (shares: readonly Share[], total: number) =>
    shares.map(([name, , count]) => `${name}: ${count} of ${total}`);
  const allOf = (selector: string, property: "textContent" | "title") =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].map((part) => part.${property})`,
    );
  results.panelSharesShown =
    same(await allOf("#ranks li", "textContent"), legendOf(RANK_SHARES, 102)) &&
    same(await allOf("#crowns li", "textContent"), legendOf(CROWN_SHARES, 14)) &&
    same(await allOf("#ranks-bar > *", "title"), barOf(RANK_SHARES, 102)) &&
    same(await allOf("#crowns-bar > *", "title"), barOf(CROWN_SHARES, 14)) &&
    (await textOf("#rank-5-percent")) === "30.4%";
  // Two blocks under their own headings, with the footnote under both: the crowns cover the
  // panel's charts only, not every chart the account has cleared. The bars are hidden from screen
  // readers, which the legends tell the same.
  results.panelBlocksShown =
    same(await allOf("#panel h2", "textContent"), ["Score ranks", "Crowns"]) &&
    (await page.evaluate<boolean>(
      `document.querySelector("#panel #panel-footnote") !== null && ["#ranks-bar", "#crowns-bar"].every((bar) => document.querySelector(bar)?.getAttribute("aria-hidden") === "true")`,
    ));
  const rendered = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.tokenInRendererDom = rendered.includes(tokens[0] ?? "?");
  // The mock serves the 九段 label at first. Its URL carries a taiko number, as Hiroba's does: only
  // the dan read off it may reach the window, never the URL or the number.
  results.danShownByName =
    (await textOf("#dan")) === "Dan: 九段" && (await textOf("#dan-unreadable")) === null;
  // The mock's page names a region, and the card leaves it out (the user's call, 2026-09-28).
  results.regionLeftOffCard =
    (await textOf("#region")) === null && !(await text()).includes("Region");
  results.taikoNoAndUrlsKeptOutOfDom =
    !rendered.includes("000000000000") && !rendered.includes("imgsrc");
  results.readsAfterSignIn = await myPageHits();

  // Hiroba's title plate under the card, asked for once the read is in, bare and with the session,
  // as my page asks for it: the mock draws it for a session only, and 600×100, not the 290:47 the
  // card reserves, so the box takes the size the PNG gives. The words stay text over it, and the
  // dan's label is the picture the read already carried.
  const attribute = (selector: string, name: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`,
    );
  await waitForSeen(page, async () => (await attribute("#title-plate-image", "src")) ?? undefined);
  // The player's first My Don ever, asked for after the plate, is the GIF the picture host draws
  // nothing with: the tile stays empty, with no spinner, and the line under the card gives its
  // code, which names the portrait alone, as the plate came.
  await waitForSeen(page, async () => (await textOf("#pictures-code")) ?? undefined);
  const MY_DON_GIF_CODE = "Code for a report: myDon=notPng status=200 type=image/gif bytes=43";
  const myDonFailureAtSignIn =
    (await myDonsSettled()) === 1 &&
    !(await exists("#my-don-image")) &&
    (await attribute("#my-don", "aria-busy")) === "false" &&
    (await exists("#title-plate-image")) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  const plateBox = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#title-plate").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  results.plateDrawnUnderTitle =
    (await attribute("#title-plate-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    Math.abs(plateBox.width / plateBox.height - 600 / 100) < 0.05 &&
    (await textOf("#profile-title")) === "Title: サンプルの称号" &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    (await textOf("#dan")) === "Dan: 九段" &&
    (await textOf("#title-plate-stand-in")) === null &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  // The plate sits on the app's own surface (the user's call, 2026-09-28): nothing from it up to
  // the card paints the yellow Hiroba draws around it, #FFCC00.
  results.plateOnAppSurface = await page.evaluate<boolean>(
    `(() => { const colours = []; for (let box = document.querySelector("#title-plate"); box !== null; box = box.parentElement) { colours.push(getComputedStyle(box).backgroundColor); if (box.id === "profile") return !colours.includes("rgb(255, 204, 0)"); } return false; })()`,
  );
  results.danLabelShownAsPicture =
    (await attribute("#dan-label", "src"))?.startsWith("data:image/png;base64,") === true;
  const withPlate = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.headerAddressesKeptOutOfDom =
    !withPlate.includes("imgsrc") &&
    !withPlate.includes("titleplate") &&
    !withPlate.includes("taiko_no") &&
    !withPlate.includes("000000000000") &&
    !withPlate.includes("_token_v2") &&
    !tokens.some((token) => withPlate.includes(token));
  const platesAtSignIn = await platesSettled();

  // Picked while the profile is shown, a language redraws the screen in place: counts, percents and
  // times in its own forms, Hiroba's words as they were, and nothing asked of Hiroba, there or back.
  const pickLanguage = async (locale: string) => {
    await waitFor(async () => (await exists('[role="menu"]')) === false || undefined);
    await click("#language-picker");
    await waitFor(async () => (await exists(`#language-${locale}`)) || undefined);
    await click(`#language-${locale}`);
    await waitFor(
      async () =>
        (await page.evaluate<string>("document.documentElement.lang")) === locale || undefined,
    );
  };
  const readsBeforeLanguage = await readHits();
  const platesBeforeLanguage = (await platesAsked()).length;
  await pickLanguage("ja");
  const readAtInJapanese = await page.evaluate<string | null>(
    `[...document.querySelectorAll("p")].map((line) => line.textContent).find((text) => text.includes(${JSON.stringify(ja.t("profile.fetchedAt").split("{time}")[1])})) ?? null`,
  );
  results.languageRedrawsInPlace =
    (await textOf("#rank-8")) === ja.t("panel.countOf", { count: "3", total: "102" }) &&
    (await textOf("#rank-5-percent")) === "30.4%" &&
    (await textOf("#profile-title")) === ja.t("profile.title", { title: "サンプルの称号" }) &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    /^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2} /.test(readAtInJapanese ?? "");
  await pickLanguage("en");
  await Bun.sleep(1000);
  results.languageAsksHirobaNothing =
    (await readHits()) === readsBeforeLanguage &&
    (await platesAsked()).length === platesBeforeLanguage &&
    (await textOf("#crowns-silver")) === "11 of 14";
  // Hiroba's own words say they are Japanese on a page in English: the nickname, the medal's
  // heading and name, and every rank's name; the crowns' English names keep the page's language.
  const langOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.lang ?? null`,
    );
  results.hirobaWordsMarkedJapanese =
    (await langOf("#profile h2")) === "ja" &&
    (await langOf("#medal h2")) === "ja" &&
    (await langOf("#medal-name")) === "ja" &&
    same(
      await page.evaluate<string[]>(
        `[...document.querySelectorAll('#ranks [lang="ja"]')].map((node) => node.textContent)`,
      ),
      ["白粋", "銅粋", "銀粋", "金雅", "桃雅", "紫雅", "虹極"],
    ) &&
    (await page.evaluate<number>(`document.querySelectorAll("#crowns [lang]").length`)) === 0;

  // Read again: one more request, no more.
  await click("#read-again");
  await until("Read at");
  await Bun.sleep(300);
  results.readsAfterReadAgain = await myPageHits();

  // A first My Don that did not come is asked for once more after a read, as the plates are. It
  // does not come this time either: the tile stays empty, and the line with it.
  await waitForSeen(page, async () => (await myDonsAsked()).length > 1 || undefined);
  const myDonsFailed = await myDonsSettled();
  results.myDonFailureCoded =
    myDonFailureAtSignIn &&
    myDonsFailed === 2 &&
    !(await exists("#my-don-image")) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;

  const dialogOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-dialog #write-outcome")?.dataset.outcome ?? null`,
    );
  /** Opens the editor, makes a pick, confirms with the tick, saves, and waits for the outcome. */
  const changeInTheWindow = async (pick: () => Promise<unknown>) => {
    await click("#costume-open");
    await waitFor(async () => (await exists("#costume-review")) || undefined);
    await pick();
    await click("#costume-review");
    await waitFor(async () => (await exists("#costume-first-write")) || undefined);
    await click("#costume-first-write");
    await waitFor(async () =>
      (await page.evaluate<boolean>(`!document.querySelector("#costume-save").disabled`))
        ? true
        : undefined,
    );
    await click("#costume-save");
    return waitFor(async () => (await dialogOutcome()) ?? undefined);
  };
  const closeEditor = async () => {
    await click("#costume-close");
    await waitFor(async () => ((await exists("#costume-dialog")) ? undefined : true));
  };
  // A write in the window that leaves the costume as it was asks the picture host for nothing, even
  // with no portrait kept to show: only a change applied, or a read, does. The line stays.
  await fetch(`${HIROBA}/__noop-save`);
  const noChange = await changeInTheWindow(() => click("#swatch-colorFace-3"));
  await closeEditor();
  results.myDonNotAskedAfterNoChange =
    noChange === "notApplied" &&
    (await myDonsSettled()) === myDonsFailed &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE &&
    same(await savedCostume(), START);

  // Once the picture host draws it, the next Read again shows the player's My Don under the plate,
  // the first time ever: once, square on its tile, named for screen readers, no line under the card,
  // and neither its address nor its host in the window.
  await fetch(`${HIROBA}/__mydon?answer=png`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Read at");
  await waitForSeen(page, async () => (await attribute("#my-don-image", "src")) ?? undefined);
  const myDonsAtFirst = await myDonsSettled();
  const tile = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#my-don").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  results.myDonShown =
    myDonsAtFirst === myDonsFailed + 1 &&
    (await attribute("#my-don-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    (await attribute("#my-don-image", "alt")) === "Your マイどん, as Hiroba draws it" &&
    tile.width > 0 &&
    Math.abs(tile.width - tile.height) < 1 &&
    !(await exists("#my-don-loading")) &&
    !(await exists("#pictures-unavailable"));
  const withMyDon = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.myDonAddressKeptOutOfDom =
    !withMyDon.includes("mydon_") &&
    !withMyDon.includes("imgsrc") &&
    !withMyDon.includes("img.127.0.0.1") &&
    !withMyDon.includes("000000000000");

  // The user's Read again renews the My Don: fetched anew once it is on screen, once, and kept.
  await click("#read-again");
  await Bun.sleep(300);
  await until("Read at");
  await waitForSeen(page, async () => (await myDonsAsked()).length > myDonsAtFirst || undefined);
  const myDonsAfterReadAgain = await myDonsSettled();
  results.myDonAgainOnReadAgain =
    myDonsAfterReadAgain === myDonsAtFirst + 1 &&
    (await attribute("#my-don-image", "src"))?.startsWith("data:image/png;base64,") === true;
  // One that does not come leaves the one kept on its tile, and no line under the card says so.
  const keptMyDon = await attribute("#my-don-image", "src");
  await fetch(`${HIROBA}/__mydon?answer=gif`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Read at");
  await waitForSeen(
    page,
    async () => (await myDonsAsked()).length > myDonsAfterReadAgain || undefined,
  );
  const myDonsAfterGif = await myDonsSettled();
  results.myDonMissingKeepsTheLast =
    myDonsAfterGif === myDonsAfterReadAgain + 1 &&
    (await attribute("#my-don-image", "src")) === keptMyDon &&
    !(await exists("#pictures-unavailable"));
  await fetch(`${HIROBA}/__mydon?answer=png`);

  // Hiroba hands out a new token on a redirect hop and ends the old one: the next read must still
  // work, and so must the one after it, which only the new token can pass.
  await fetch(`${HIROBA}/__rotate`);
  await click("#read-again");
  await Bun.sleep(500);
  await until("Read at");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await click("#read-again");
  await Bun.sleep(500);
  await until("Read at");
  results.rotationTakenUp =
    tokens[1] !== tokens[0] &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    !(await text()).includes("ended");
  // Three reads more of the same title: the plate is asked for again after each, and answered
  // from the plate kept on disk, asking Hiroba nothing.
  const platesAfterRereads = await platesSettled();

  // Every shape my page can take is a normal state: each renders in its place with the rest of
  // the page around it. Each read is two requests while my page shows a dan, my page and its
  // label, and one without. The mock starts on a count, read above.
  const readShowing = async (selector: string) => {
    const before = await readHits();
    await click("#read-again");
    await waitFor(async () => ((await textOf(selector)) === null ? undefined : true));
    await Bun.sleep(300);
    return (await readHits()) - before;
  };
  const requestsPerRead: number[] = [];
  await fetch(`${HIROBA}/__medal?state=complete`);
  requestsPerRead.push(await readShowing("#medal-complete"));
  results.medalCompleteShown =
    (await textOf("#medal-complete")) === "COMPLETE" && (await textOf("#medal-count")) === null;
  await fetch(`${HIROBA}/__medal?state=odd`);
  requestsPerRead.push(await readShowing("#medal-code"));
  results.medalOddShownWithTheRest =
    (await textOf("#medal-code")) === "Code for a report: medal=noCountNoComplete" &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    (await textOf("#rank-8")) === "3 of 102" &&
    !(await text()).includes("did not expect");
  await fetch(`${HIROBA}/__medal?state=none`);
  requestsPerRead.push(await readShowing("#medal-none"));
  results.medalNoneShown = (await textOf("#medal-name")) === null;
  await fetch(`${HIROBA}/__medal?state=collecting`);
  await fetch(`${HIROBA}/__variant?dan=0&title=empty&region=unset`);
  requestsPerRead.push(await readShowing("#no-title"));
  results.medalCountShown = (await textOf("#medal-count")) === "Collected: 12";
  results.danLessRowRead =
    (await text()).includes("サンプルどん") &&
    (await textOf("#dan")) === null &&
    (await textOf("#dan-unreadable")) === null;
  // Unset so far: no favourite song and an empty folder. Set, the song shows by title and the
  // folder, closed at first, opens on request with every song in it, the two that share a title
  // included.
  results.favoritesUnsetShown =
    (await textOf("#favorite-song")) === "Favourite song: none" &&
    (await textOf("#favorite-folder-empty")) !== null;
  await fetch(`${HIROBA}/__variant?favorites=set`);
  requestsPerRead.push(await readShowing("#favorite-folder"));
  const folderSummary = "#favorite-folder .MuiAccordionSummary-root";
  const folderOpen = () =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(folderSummary)})?.getAttribute("aria-expanded") ?? null`,
    );
  const closedAtFirst = (await folderOpen()) === "false";
  await click(folderSummary);
  await waitFor(async () => ((await folderOpen()) === "true" ? true : undefined));
  const folderRows = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#favorite-folder li")].map((row) => row.textContent)`,
  );
  results.favoritesSetShown =
    (await textOf("#favorite-song")) === "Favourite song: サンプル曲アルファ" &&
    (await textOf(folderSummary)) === "Favourites folder (3)" &&
    (await textOf("#favorite-folder-empty")) === null &&
    closedAtFirst &&
    JSON.stringify(folderRows) ===
      JSON.stringify(["サンプル曲ベータ", "サンプル曲ガンマ", "サンプル曲ベータ"]);
  // A label that does not read, here the 43-byte GIF Hiroba sends when it has nothing to draw,
  // costs the dan alone: a neutral line and a code, the rest of the page as it was, still no URL.
  await fetch(`${HIROBA}/__variant?dan=14&label=gif`);
  requestsPerRead.push(await readShowing("#dan-unreadable"));
  const afterGif = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.unreadableDanShownWithTheRest =
    (await textOf("#dan-unreadable")) === "Dan: couldn't read" &&
    (await textOf("#dan-code")) ===
      "Code for a report: dan=notPng status=200 type=image/gif bytes=43" &&
    (await textOf("#dan")) === null &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    !afterGif.includes("000000000000") &&
    !afterGif.includes("imgsrc");
  // Three reads with a dan (complete, odd and no medal), two without (dan-less, favourites), and
  // one with a label that did not read.
  results.twoRequestsWithDanOneWithout =
    JSON.stringify(requestsPerRead) === JSON.stringify([2, 2, 2, 1, 1, 2]);
  // The label's picture is the label the read fetched to read the dan: no request of its own.
  results.danLabelPictureCostsNothing =
    results.twoRequestsWithDanOneWithout === true && results.danLabelShownAsPicture === true;
  await fetch(`${HIROBA}/__variant?dan=14&label=png&title=set&region=set&favorites=unset`);

  // Counts of 0, common on real accounts: 虹極 at 0 in a block that is not, and a crown block that
  // sums to 0. Every item is still listed, at 0.0%; only those above 0 take a part of a bar, and a
  // block with none shows its empty track, which a block with parts does not.
  await fetch(`${HIROBA}/__variant?panel=zeros`);
  await click("#read-again");
  await waitFor(async () => ((await textOf("#crowns-silver")) === "0 of 0" ? true : undefined));
  const ZERO_RANK_SHARES: readonly Share[] = [
    ["白粋", "4.0%", 4],
    ["銅粋", "9.1%", 9],
    ["銀粋", "18.2%", 18],
    ["金雅", "31.3%", 31],
    ["桃雅", "25.3%", 25],
    ["紫雅", "12.1%", 12],
    ["虹極", "0.0%", 0],
  ];
  const ZERO_CROWN_SHARES: readonly Share[] = CROWN_SHARES.map(([name]) => [name, "0.0%", 0]);
  const trackOf = (bar: string) =>
    page.evaluate<string>(
      `getComputedStyle(document.querySelector(${JSON.stringify(bar)})).backgroundColor`,
    );
  const NO_TRACK = "rgba(0, 0, 0, 0)";
  results.panelZerosShown =
    same(await allOf("#ranks li", "textContent"), legendOf(ZERO_RANK_SHARES, 99)) &&
    same(await allOf("#ranks-bar > *", "title"), barOf(ZERO_RANK_SHARES.slice(0, -1), 99)) &&
    same(await allOf("#crowns li", "textContent"), legendOf(ZERO_CROWN_SHARES, 0)) &&
    (await allOf("#crowns-bar > *", "title")).length === 0 &&
    (await trackOf("#crowns-bar")) !== NO_TRACK &&
    (await trackOf("#ranks-bar")) === NO_TRACK;
  await fetch(`${HIROBA}/__variant?panel=counts`);

  // A plate that does not come, here the GIF Hiroba draws nothing with, for a title not yet
  // fetched: the plain band stands in, one line under the card says so with its code, and every
  // word of the card is as it was. The next read asks for it once more, and it shows.
  const platesBeforeOther = (await platesSettled()).length;
  const readAndWait = async (ready: () => Promise<boolean>) => {
    await click("#read-again");
    await Bun.sleep(300);
    await until("Read at");
    await waitForSeen(page, async () => (await ready()) || undefined);
    return platesSettled();
  };
  const shownNow = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await fetch(`${HIROBA}/__titleplate?answer=gif`);
  await fetch(`${HIROBA}/__variant?title=other`);
  await readAndWait(() => shownNow("#pictures-code"));
  const blankShown =
    (await textOf("#pictures-code")) ===
      "Code for a report: titlePlate=notPng status=200 type=image/gif bytes=43" &&
    (await shownNow("#title-plate-stand-in")) &&
    !(await shownNow("#title-plate-image")) &&
    (await textOf("#profile-title")) === "Title: 別のサンプル称号" &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    (await textOf("#dan")) === "Dan: 九段";
  await fetch(`${HIROBA}/__titleplate?answer=png`);
  const afterOther = await readAndWait(() => shownNow("#title-plate-image"));
  results.plateBlankFallsBack =
    blankShown &&
    !(await shownNow("#pictures-unavailable")) &&
    afterOther.length - platesBeforeOther === 2;
  // Each title is a plate of its own, fetched once: back to the first title, and to the second
  // again, the plates kept on disk answer, and Hiroba is asked for nothing more.
  await fetch(`${HIROBA}/__variant?title=set`);
  await readAndWait(async () => (await textOf("#profile-title")) === "Title: サンプルの称号");
  await fetch(`${HIROBA}/__variant?title=other`);
  await readAndWait(async () => (await textOf("#profile-title")) === "Title: 別のサンプル称号");
  await fetch(`${HIROBA}/__variant?title=set`);
  const afterTitles = await readAndWait(
    async () => (await textOf("#profile-title")) === "Title: サンプルの称号",
  );
  results.plateOncePerTitle =
    platesAtSignIn.length === 1 &&
    platesAfterRereads.length === 1 &&
    afterTitles.length === afterOther.length &&
    askedAsMyPage(afterTitles);

  // The どんメダル plate, asked for only once its card is on screen, so each read scrolls to it.
  // Tried on a season no read has shown yet, so every plate below is new to the device: first one
  // that does not come, the GIF, then the same one again, which shows under the card's words.
  const readMedal = async () => {
    await click("#read-again");
    await Bun.sleep(300);
    await until("Read at");
  };
  /** Scrolls the どんメダル card on screen, waits for `ready`, and counts the plates fetched. */
  const showMedal = async (ready: () => Promise<boolean>) => {
    await page.evaluate(`document.querySelector("#medal").scrollIntoView({ block: "center" })`);
    await waitForSeen(page, async () => (await ready()) || undefined);
    return medalPlatesSettled();
  };
  const readMedalShowing = async (ready: () => Promise<boolean>) => {
    await readMedal();
    return showMedal(ready);
  };
  const medalPlateSrc = () => attribute("#medal-plate-image", "src");
  medalIds.push(medalIdShown());
  await fetch(`${HIROBA}/__tokenplate?answer=gif`);
  await fetch(`${HIROBA}/__medal?state=collecting&season=2`);
  const medalPlatesBefore = await medalPlatesSettled();
  // A read lands at the top of the page, where the 960×720 window already shows the plate's top
  // edge; in one this short, the card is below the fold: the new season shows, and no plate is
  // asked for until the card is scrolled on screen, then one.
  const SHORT_VIEWPORT_PX = 400;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 0,
    height: SHORT_VIEWPORT_PX,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await readMedal();
  const newSeasonBelowFold =
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#medal-plate").getBoundingClientRect().top >= innerHeight`,
    ));
  const medalPlatesOffScreen = await medalPlatesSettled();
  const medalPlatesPerRead = [await showMedal(() => shownNow("#medal-plate-code"))];
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  results.medalPlateAskedOnlyOnScreen =
    newSeasonBelowFold &&
    medalPlatesOffScreen === medalPlatesBefore &&
    medalPlatesPerRead[0] === medalPlatesBefore + 1;
  medalIds.push(medalIdShown());
  // Missing, the plate is a pale pill of its shape, and every word on it is still there as text.
  results.medalPlateMissingReadsAsText =
    (await textOf("#medal-plate-code")) ===
      "Code for a report: medalPlate=notPng status=200 type=image/gif bytes=43" &&
    (await shownNow("#medal-plate-stand-in")) &&
    !(await shownNow("#medal-plate-image")) &&
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await textOf("#medal-count")) === "Collected: 12";
  await fetch(`${HIROBA}/__tokenplate?answer=png`);
  medalPlatesPerRead.push(await readMedalShowing(() => shownNow("#medal-plate-image")));
  // The mock draws it 600×100, not the 290:50 the card reserves: the box takes the PNG's size. The
  // name and the count stay text over it, the number drawn and the whole named for screen readers.
  const medalBox = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#medal-plate").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  results.medalPlateDrawnUnderText =
    (await medalPlateSrc())?.startsWith("data:image/png;base64,") === true &&
    Math.abs(medalBox.width / medalBox.height - 600 / 100) < 0.05 &&
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await textOf("#medal-count")) === "Collected: 12" &&
    (await textOf("#medal-plate"))?.replace("Collected: 12", "").includes("12") === true &&
    !(await shownNow("#medal-plate-stand-in")) &&
    !(await shownNow("#medal-plate-unavailable"));
  // No yellow behind it either (the user's call, 2026-09-28): nothing from it up to the card paints
  // Hiroba's #FFCC00.
  results.medalPlateOnAppSurface = await page.evaluate<boolean>(
    `(() => { const colours = []; for (let box = document.querySelector("#medal-plate"); box !== null; box = box.parentElement) { colours.push(getComputedStyle(box).backgroundColor); if (box.id === "medal") return !colours.includes("rgb(255, 204, 0)"); } return false; })()`,
  );
  // The id names the player's season: it stays in main, and the window holds neither it nor the
  // plate's address.
  const withMedalPlate = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.medalIdKeptOutOfDom =
    medalIds.every((id) => id.length === 48 && !withMedalPlate.includes(id)) &&
    medalIds[0] !== medalIds[1] &&
    !withMedalPlate.includes("tokenplate");
  // Read again, the plate kept on disk answers. COMPLETE is a plate of its own, fetched once and
  // then kept too: back to the count, and to COMPLETE again, Hiroba is asked for nothing more.
  medalPlatesPerRead.push(await readMedalShowing(() => shownNow("#medal-plate-image")));
  const collectingSrc = await medalPlateSrc();
  await fetch(`${HIROBA}/__medal?state=complete`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await medalPlateSrc()) !== collectingSrc),
  );
  const completeShown =
    (await textOf("#medal-complete")) === "COMPLETE" && (await textOf("#medal-count")) === null;
  await fetch(`${HIROBA}/__medal?state=collecting`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await medalPlateSrc()) === collectingSrc),
  );
  await fetch(`${HIROBA}/__medal?state=complete`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await textOf("#medal-complete")) !== null),
  );
  results.medalPlateOncePerIdAndState =
    completeShown &&
    same(
      medalPlatesPerRead.map((count) => count - medalPlatesBefore),
      [1, 2, 2, 3, 3, 3],
    );
  // Back to the first season's count, whose plate this device keeps from here on at the latest, for
  // the reopen below; the card scrolled away again, so the title plate is on screen for what follows.
  await fetch(`${HIROBA}/__medal?state=collecting&season=1`);
  await readMedalShowing(() => shownNow("#medal-plate-image"));
  await page.evaluate("window.scrollTo(0, 0)");

  // Costume writes. This run opened the gate (unpackaged, ABTH_UNVERIFIED_WRITES=1), so the card
  // offers the editor, and every write is unverified: a tick to confirm, and the title read twice.
  const cardOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#profile #write-outcome")?.dataset.outcome ?? null`,
    );
  /** Waits for the card's undo to end, from the Snackbar or the card's own button. */
  const undoFrom = async (selector: string) => {
    await click(selector);
    await Bun.sleep(200);
    return waitFor(async () => (await cardOutcome()) ?? undefined);
  };
  /** A write straight through the bridge, as the renderer would ask for one. */
  const bridgeChange = (target: Record<string, number>, expected = START) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeCostume(${JSON.stringify({ expected, target })})`,
    );

  results.writeGateOpen =
    same(await page.evaluate("window.abth.enabledWrites()"), [
      { kind: "costume", verified: false },
    ]) &&
    (await page.evaluate<boolean>(`document.querySelector("#costume-open")?.disabled === false`)) &&
    !(await exists("#costume-not-open"));

  // The editor's picture of the set, which the mock draws from the query and for a session only:
  // a picture shown means the session went with the request. One request on opening, by the
  // site's names in the site's order, then one per pause in the picks; in the window, a data: URL.
  const previewSrc = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-preview-image")?.getAttribute("src") ?? null`,
    );
  /** The picture once it is settled and is not `before`: no spinner, and a picture shown. */
  const previewOtherThan = (before: string | null) =>
    waitFor(async () => {
      const src = await previewSrc();
      const loading = await exists("#costume-preview-loading");
      return src !== null && src !== before && !loading ? src : undefined;
    });
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#costume-open");
  const onOpen = await previewOtherThan(null);
  await Bun.sleep(500);
  results.previewShownOnOpen =
    onOpen.startsWith("data:image/png;base64,") &&
    same(await previewQueries(), [previewQuery(START)]);
  await click("#swatch-colorFace-3");
  const afterColour = await previewOtherThan(onOpen);
  results.previewChangesAfterColour =
    afterColour.startsWith("data:image/png;base64,") &&
    same(await previewQueries(), [previewQuery(START), previewQuery({ ...START, colorFace: 3 })]);
  // Five picks, each well inside the pause after the one before: one request, for the last.
  await fetch(`${HIROBA}/__previews?reset=1`);
  for (const id of [7, 9, 11, 13, 15]) {
    await click(`#swatch-colorFace-${id}`);
    await Bun.sleep(40);
  }
  const afterBurst = await previewOtherThan(afterColour);
  await Bun.sleep(800);
  results.previewBurstSendsOne =
    afterBurst.startsWith("data:image/png;base64,") &&
    same(await previewQueries(), [previewQuery({ ...START, colorFace: 15 })]);
  const withPreview = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.previewAddressAndCookieKeptOutOfDom =
    !withPreview.includes("imgsrc") &&
    !withPreview.includes("cos1=") &&
    !withPreview.includes("_token_v2") &&
    !tokens.some((token) => withPreview.includes(token));
  // A picture that does not come, here the GIF Hiroba draws nothing with: the last picture stays,
  // a note and a code say so, and the editor works as before.
  await fetch(`${HIROBA}/__preview?answer=gif`);
  await click("#swatch-colorFace-20");
  await waitFor(async () => (await exists("#costume-preview-unavailable")) || undefined);
  results.previewFailureLeavesTheEditor =
    (await textOf("#costume-preview-code")) ===
      "Code for a report: preview=notPng status=200 type=image/gif bytes=43" &&
    (await previewSrc()) === afterBurst &&
    (await page.evaluate<boolean>(`document.querySelector("#costume-review").disabled === false`));
  await fetch(`${HIROBA}/__preview?answer=png`);
  // Shut, the editor asks for nothing more.
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#swatch-colorFace-21");
  await closeEditor();
  await Bun.sleep(800);
  results.previewNoneOnceShut = same(await previewQueries(), []);

  // The items' thumbnails, which the mock draws for a session only: a picture shown means the
  // session went with the request. With forty more items in the きぐるみ slot than its box shows,
  // only the rows on screen and one ahead are asked for, each once, from the editor, and only for
  // items the editor offered; opened again, the editor asks for none of them.
  type Thumb = { cos: number; type: number; referer: string | null };
  const thumbs = async () => (await (await fetch(`${HIROBA}/__thumbs`)).json()) as Thumb[];
  /** The thumbnails asked for, once none more has been for a second. */
  const thumbsSettled = async () => {
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
  const openItems = async () => {
    await click("#costume-open");
    await waitFor(async () => (await exists("#costume-tab-items")) || undefined);
    await click("#costume-tab-items");
    await waitFor(async () => (await exists("#costume-items-costume1")) || undefined);
  };
  await fetch(`${HIROBA}/__thumbs?reset=1`);
  const owned = (await (await fetch(`${HIROBA}/__items?many=1`)).json()) as Record<
    string,
    number[]
  >;
  const ownedIn = (slot: number) => owned[String(slot)] ?? [];
  await openItems();
  await waitFor(async () => (await exists("#item-costume1-4 img")) || undefined);
  const seen = await thumbsSettled();
  results.thumbnailsShownAsPictures =
    (
      await page.evaluate<string | null>(
        `document.querySelector("#item-costume1-4 img")?.getAttribute("src") ?? null`,
      )
    )?.startsWith("data:image/png;base64,") === true &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-items-costume1 img").length`,
    )) === seen.length;
  results.thumbnailsOnlyWhenSeen =
    seen.length > 0 &&
    seen.length <= 5 * 6 &&
    seen.length < ownedIn(1).length &&
    new Set(seen.map((thumb) => thumb.cos)).size === seen.length &&
    seen.every(
      (thumb) =>
        thumb.type === 1 &&
        ownedIn(1).includes(thumb.cos) &&
        thumb.referer === `${HIROBA}/mypage_kisekae.php`,
    );
  // The editor's heading, tabs, はずす and items are Hiroba's words, so they say they are Japanese.
  results.editorWordsMarkedJapanese = same(
    await page.evaluate<(string | null)[]>(
      `["#costume-dialog h2", "#costume-tab-items", "#costume-part-costume1", "#item-costume1-0", "#item-costume1-4"].map((selector) => document.querySelector(selector)?.lang ?? null)`,
    ),
    ["ja", "ja", "ja", "ja", "ja"],
  );
  const withThumbnails = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.thumbnailAddressesKeptOutOfDom =
    !withThumbnails.includes("imgsrc") &&
    !withThumbnails.includes("cos=") &&
    !withThumbnails.includes("_token_v2") &&
    !tokens.some((token) => withThumbnails.includes(token));
  await closeEditor();
  await openItems();
  await waitFor(async () => (await exists("#item-costume1-4 img")) || undefined);
  await Bun.sleep(1500);
  results.thumbnailsAskedOncePerRun = (await thumbs()).length === seen.length;
  // A thumbnail that does not come, here the GIF Hiroba draws nothing with: the item shows its
  // number, one line under the box says how many did not come and gives the code, and nothing is
  // asked for again in that opening, however the slots are switched.
  await fetch(`${HIROBA}/__thumb?answer=gif`);
  await click("#costume-part-costume2");
  await waitFor(async () => (await exists("#costume-thumbnails-code")) || undefined);
  const thumbsAfterGif = await thumbsSettled();
  await click("#costume-part-costume1");
  await Bun.sleep(300);
  await click("#costume-part-costume2");
  await Bun.sleep(1500);
  const slotTwoAsked = thumbsAfterGif.slice(seen.length);
  results.thumbnailGifLeavesTheId =
    (await textOf("#costume-thumbnails-unavailable > :first-child")) ===
      `Some thumbnails didn't load (${ownedIn(2).length}); their numbers are shown instead.` &&
    (await textOf("#costume-thumbnails-code")) ===
      "Code for a report: costumeItem=notPng status=200 type=image/gif bytes=43" &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-thumbnails-code").length`,
    )) === 1 &&
    (await textOf("#item-costume2-21")) === "#21" &&
    !(await exists("#item-costume2-21 img")) &&
    slotTwoAsked.length === ownedIn(2).length &&
    slotTwoAsked.every((thumb) => thumb.type === 2) &&
    (await thumbs()).length === thumbsAfterGif.length;
  // Opened again, the editor asks once more for the thumbnails that did not come, and for nothing
  // else: they show, and the line under the box is gone.
  await fetch(`${HIROBA}/__thumb?answer=png`);
  await closeEditor();
  await openItems();
  await click("#costume-part-costume2");
  await waitFor(async () => (await exists("#costume-items-costume2")) || undefined);
  const askedOnReopen = (await thumbsSettled()).slice(thumbsAfterGif.length);
  results.failedThumbnailsAskedAgainOnReopen =
    same(
      askedOnReopen.map((thumb) => `${thumb.type}/${thumb.cos}`).sort(),
      ownedIn(2)
        .map((id) => `2/${id}`)
        .sort(),
    ) &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-items-costume2 img").length`,
    )) === ownedIn(2).length &&
    !(await exists("#costume-thumbnails-unavailable"));
  await closeEditor();
  await fetch(`${HIROBA}/__items?many=0`);
  // Asked for straight through the bridge: an item the editor did not offer is refused unsent, and
  // any other shape is refused before the verb runs, a URL among them.
  const thumbsBeforeRefusals = (await thumbs()).length;
  results.thumbnailNotOfferedRefusedUnsent =
    same(
      await page.evaluate(`window.abth.readPicture({ kind: "costumeItem", slot: 1, id: 999 })`),
      {
        ok: false,
        error: { code: "costumeItem=notOffered" },
      },
    ) && (await thumbs()).length === thumbsBeforeRefusals;
  const refusalOf = (want: string) =>
    page.evaluate<string>(
      `window.abth.readPicture(${want}).then(() => "answered", (error) => String(error.message))`,
    );
  const refusals = [
    await refusalOf(`{ kind: "costumeItem", slot: 1, id: 4, url: "${HIROBA}/imgsrc_kisekae.php" }`),
    await refusalOf(`{ kind: "costumeItem", slot: 6, id: 4 }`),
    await refusalOf(`{ kind: "costumeItem", slot: 1, id: 1.5 }`),
    await refusalOf(`{ kind: "titlePlate", url: "${HIROBA}/imgsrc_titleplate.php" }`),
    await refusalOf(`{ kind: "titlePlate", slot: 1 }`),
  ];
  results.pictureShapesRefused =
    refusals.every((message) =>
      message.includes("Refused abth:read-picture: arguments it does not take"),
    ) && (await thumbs()).length === thumbsBeforeRefusals;

  // A colour alone: exactly the planned requests, the ajax headers on both posts, one field moved.
  // The pick's picture goes about when Review and Save are pressed: before the write or after it.
  const myDonsBeforeColour = await myDonsSettled();
  const myDonBeforeColour = await attribute("#my-don-image", "src");
  await resetLog();
  await fetch(`${HIROBA}/__posts?reset=1`);
  const colourOutcome = await changeInTheWindow(() => click("#swatch-colorFace-3"));
  results.colourApplied = colourOutcome === "applied";
  results.colourSentOnlyThePlannedRequests = sentAsPlanned(
    await requestLog(),
    ["GET /mypage_kisekae.php"],
    WRITE_REQUESTS,
  );
  results.colourMovedOneField = same(await savedCostume(), { ...START, colorFace: 3 });
  const posts = (await (await fetch(`${HIROBA}/__posts`)).json()) as {
    path: string;
    xRequestedWith: string | null;
    origin: string | null;
    referer: string | null;
    contentType: string | null;
    fields: string[];
    ticketMatched: boolean;
  }[];
  results.postsCarryTheAjaxShape =
    same(
      posts.map((post) => post.path),
      ["/ajax/check_ip_kisekae.php", "/ajax/change_mydon.php"],
    ) &&
    posts.every(
      (post) =>
        post.xRequestedWith === "XMLHttpRequest" &&
        post.origin === HIROBA &&
        post.referer === `${HIROBA}/mypage_kisekae.php` &&
        post.contentType === "application/x-www-form-urlencoded; charset=UTF-8" &&
        same(post.fields, ["_tckt", ...COSTUME_FIELDS]) &&
        post.ticketMatched,
    );
  // The costume changed: the My Don on the card, behind the editor, is fetched anew, once, and
  // shows the new one.
  await waitForSeen(
    page,
    async () => (await myDonsAsked()).length > myDonsBeforeColour || undefined,
  );
  const myDonsAfterColour = await myDonsSettled();
  const myDonAfterColour = await attribute("#my-don-image", "src");
  // The change's undo is offered once the editor is closed, never over it.
  await Bun.sleep(500);
  const snackbarOverTheEditor = await exists("#snackbar-undo");
  await closeEditor();

  // Undone from the Snackbar the change offered: the whole set back, by a write like any other.
  // Pressed twice, as a double-click would: the second press finds it shut and sends nothing.
  await waitFor(async () => (await exists("#snackbar-undo")) || undefined);
  await resetLog();
  await click("#snackbar-undo");
  const secondPressShut = await page.evaluate<boolean>(
    `(() => { const undo = document.querySelector("#snackbar-undo"); if (undo === null) return true; const shut = undo.disabled; undo.click(); return shut; })()`,
  );
  await Bun.sleep(200);
  results.colourUndoneFromSnackbar =
    (await waitFor(async () => (await cardOutcome()) ?? undefined)) === "applied" &&
    (await textOf("#profile #write-outcome")) === "Undone. Hiroba shows the costume as it was." &&
    same(await savedCostume(), START) &&
    sameBesideLanePictures(await requestLog(), WRITE_REQUESTS);
  results.snackbarUndoOncePerPress = !snackbarOverTheEditor && secondPressShut;
  // So does the undo: once more, and the My Don is back as it was.
  await waitForSeen(
    page,
    async () => (await myDonsAsked()).length > myDonsAfterColour || undefined,
  );
  results.myDonAgainAfterWrite =
    myDonsAfterColour === myDonsBeforeColour + 1 &&
    myDonAfterColour?.startsWith("data:image/png;base64,") === true &&
    myDonAfterColour !== myDonBeforeColour &&
    (await myDonsSettled()) === myDonsAfterColour + 1 &&
    (await attribute("#my-don-image", "src")) === myDonBeforeColour;

  // A きぐるみ: the window warns, the four pieces come off, and one undo puts all eight back.
  const kigurumiOutcome = await changeInTheWindow(async () => {
    await click("#costume-tab-items");
    await waitFor(async () => (await exists("#item-costume1-36")) || undefined);
    await click("#item-costume1-36");
    await waitFor(async () => (await exists("#kigurumi-warning")) || undefined);
  });
  // The card no longer says the costume is as it was before the colour: that undo is behind it.
  results.undoneNoteClearedByNextChange = (await cardOutcome()) === null;
  results.kigurumiEmptiesThePieces =
    kigurumiOutcome === "applied" &&
    same(await savedCostume(), {
      ...START,
      costume1: 36,
      costume2: 0,
      costume3: 0,
      costume4: 0,
      costume5: 0,
    });
  await closeEditor();
  const savesBeforeUndo = await hitsOn("/ajax/change_mydon.php");
  results.kigurumiUndoneInOnePost =
    (await undoFrom("#costume-undo")) === "applied" &&
    same(await savedCostume(), START) &&
    (await hitsOn("/ajax/change_mydon.php")) - savesBeforeUndo === 1 &&
    !(await exists("#costume-undo"));
  // The My Don fetched anew after that change and its undo is in before the log is read below.
  await myDonsSettled();

  // #22: a piece beside a きぐるみ, which Hiroba would answer 0 to and ignore, is refused unsent.
  // While costume is unverified the title is read first, before the editor, so the trap costs that
  // read too — but no post.
  await resetLog();
  const trap = await bridgeChange({ ...START, costume1: 36 });
  results.trapRefusedUnsent =
    same(trap, { kind: "invalidTarget", field: "costume1" }) &&
    sameBesideLanePictures(await requestLog(), ["GET /mypage_top.php", "GET /mypage_kisekae.php"]);

  // A picture asked for while a write waits on its pre-check waits for the whole write, read-back
  // and all: held there, it would otherwise go between the pre-check and the save.
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeHeld = await hitsOn("/ajax/check_ip_kisekae.php");
  const heldWrite = bridgeChange({ ...START, colorLimb: 20 });
  await waitFor(
    async () => (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeHeld || undefined,
  );
  const previewDuringWrite = page.evaluate<boolean>(
    `window.abth.previewCostume(${JSON.stringify(START)}).then((result) => result.ok)`,
  );
  await Bun.sleep(300);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  results.previewWaitsOutAWrite =
    (await heldWrite).kind === "applied" &&
    (await previewDuringWrite) &&
    sameBesideLanePictures(await requestLog(), [...WRITE_REQUESTS, PREVIEW]);
  await fetch(`${HIROBA}/__state?reset=1`);

  // So does an item's thumbnail: one the last editor offered and nothing has asked for yet, a
  // ぷちキャラ, lands after the read-back.
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeThumbnail = await hitsOn("/ajax/check_ip_kisekae.php");
  const writeBeforeThumbnail = bridgeChange({ ...START, colorLimb: 20 });
  await waitFor(
    async () =>
      (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeThumbnail || undefined,
  );
  const thumbnailDuringWrite = page.evaluate<boolean>(
    `window.abth.readPicture({ kind: "costumeItem", slot: 5, id: 143 }).then((result) => result.ok)`,
  );
  await Bun.sleep(300);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  results.pictureWaitsOutAWrite =
    (await writeBeforeThumbnail).kind === "applied" &&
    (await thumbnailDuringWrite) &&
    same(await requestLog(), [...WRITE_REQUESTS, THUMBNAIL]);
  await fetch(`${HIROBA}/__state?reset=1`);

  // A save that answers 0 and moves nothing reads as not applied, whatever it said.
  await fetch(`${HIROBA}/__noop-save`);
  const noop = await bridgeChange({ ...START, colorLimb: 20 });
  results.noopSaveNotApplied =
    noop.kind === "notApplied" &&
    same(noop.reason, { kind: "unchanged" }) &&
    same(await savedCostume(), START);

  // A pre-check that asks for a confirmation stops the write before its save.
  const savesBeforePrechecks = await hitsOn("/ajax/change_mydon.php");
  const stops: string[] = [];
  for (const answer of ["true", "1", "string1", "0", "html"]) {
    await fetch(`${HIROBA}/__precheck?answer=${answer}`);
    stops.push((await bridgeChange({ ...START, colorLimb: 20 })).kind);
  }
  await fetch(`${HIROBA}/__precheck?answer=false`);
  results.precheckStopsTheSave =
    same(stops, [
      "needsConfirmation",
      "needsConfirmation",
      "needsConfirmation",
      "stoppedBeforeWrite",
      "stoppedBeforeWrite",
    ]) && (await hitsOn("/ajax/change_mydon.php")) === savesBeforePrechecks;

  // A post answered with the login page is only a signal: one GET finds the session still good.
  await fetch(`${HIROBA}/__post-to-login?on=1`);
  const atLogin = await bridgeChange({ ...START, colorLimb: 20 });
  await fetch(`${HIROBA}/__post-to-login?on=0`);
  results.postToLoginKeepsTheSession =
    atLogin.kind === "stoppedBeforeWrite" &&
    atLogin.reason === "precheckAtLogin" &&
    (await page.evaluate<boolean>("window.abth.isSignedIn()"));

  // Changed elsewhere after a change: its undo stops unsent, says why, and is withdrawn.
  const changedElsewhere = await bridgeChange({ ...START, colorLimb: 20 });
  await click("#read-again");
  await waitFor(async () => (await exists("#costume-undo")) || undefined);
  await fetch(`${HIROBA}/__state?color_body=40`);
  const savesBeforeStaleUndo = await hitsOn("/ajax/change_mydon.php");
  results.staleUndoWithdrawn =
    changedElsewhere.kind === "applied" &&
    (await undoFrom("#costume-undo")) === "changedSincePreview" &&
    (await hitsOn("/ajax/change_mydon.php")) === savesBeforeStaleUndo &&
    !(await exists("#costume-undo")) &&
    (await savedCostume()).colorBody === 40;
  await fetch(`${HIROBA}/__state?reset=1`);
  // No form token the mock handed out reaches the window.
  const handedOut = (await (await fetch(`${HIROBA}/__tickets`)).json()) as string[];
  const windowNow = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.formTokensKeptOutOfDom =
    handedOut.length > 0 && !handedOut.some((ticket) => windowNow.includes(ticket));

  // The session ends while the change is being reviewed: nothing is posted, and it is back to
  // signing in.
  await click("#read-again");
  await until("Read at");
  const postsBeforeExpiry = await hitsOn("/ajax/check_ip_kisekae.php");
  await click("#costume-open");
  await waitFor(async () => (await exists("#swatch-colorFace-9")) || undefined);
  await click("#swatch-colorFace-9");
  await click("#costume-review");
  await waitFor(async () => (await exists("#costume-first-write")) || undefined);
  await click("#costume-first-write");
  await fetch(`${HIROBA}/__expire`);
  await Bun.sleep(100);
  await click("#costume-save");
  await until("Hiroba ended the session before anything was saved");
  results.sessionGoneBeforeSaveSendsNothing =
    (await hitsOn("/ajax/check_ip_kisekae.php")) === postsBeforeExpiry &&
    (await exists("#sign-in")) &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));

  // The session ends after the save: the session is dropped, whether it saved is unknown, and
  // the next editor read settles the undo from what the costume is.
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await fetch(`${HIROBA}/__expire-on-save`);
  const afterSave = await bridgeChange({ ...START, colorFace: 7 });
  const droppedAfterSave =
    afterSave.kind === "sessionGone" &&
    afterSave.writeMayHaveHappened === true &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));
  await click("#read-again");
  await until("You are not signed in.");
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  const noUndoBeforeTheRead = same(await page.evaluate("window.abth.pendingUndo()"), []);
  await page.evaluate("window.abth.openCostumeEditor()");
  results.sessionGoneAfterSaveSettlesOnNextRead =
    droppedAfterSave &&
    noUndoBeforeTheRead &&
    same(await page.evaluate("window.abth.pendingUndo()"), [
      {
        kind: "costume",
        at: new Date(NOON_JST).toISOString(),
        before: START,
        after: { ...START, colorFace: 7 },
      },
    ]);
  // Back where it started, and the undo on offer left for the reopen to find.
  await fetch(`${HIROBA}/__state?reset=1&color_face=7`);

  await fetch(`${HIROBA}/__expire`);
  await click("#read-again");
  await until("Your Hiroba session has ended");
  results.lostSessionHandled = true;

  await click("#sign-in");
  await Bun.sleep(300);
  await clickButton("Cancel sign-in");
  await until("Sign-in was cancelled.");
  results.cancelHandled = true;

  // Sent off both sites: the attempt ends and names the host, instead of sitting there silently.
  await fetch(`${HIROBA}/__offsite?on=1`);
  await click("#sign-in");
  await until("offsite.127.0.0.1.sslip.io:8808, which this app does not open");
  await fetch(`${HIROBA}/__offsite?on=0`);
  results.refusalNamed = true;

  // Hiroba ended the session above, so no sign-out forgot the window's pictures: a sign-in does, as
  // whoever signs in may be another player. The card's first frame shows none of the last session's,
  // and the pictures come after it.
  await page.evaluate(
    `(() => { window.firstCard = null; const observer = new MutationObserver(() => { if (document.querySelector("#profile") === null) return; window.firstCard = ["#title-plate-image", "#my-don-image"].map((selector) => document.querySelector(selector) !== null); observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); })()`,
  );
  await click("#sign-in");
  await until("サンプルどん");
  await waitForSeen(page, async () => (await exists("#my-don-image")) || undefined);
  results.signInForgetsThePictures =
    same(await page.evaluate("window.firstCard"), [false, false]) &&
    (await exists("#title-plate-image"));
  const kept = (await (await fetch(`${HIROBA}/__last-token`)).text()).trim();
  tokens.push(kept);
  // Kept on disk for the next launch: the user chose staying signed in over a memory-only session.
  results.sessionKept =
    existsSync(SESSION_FILE) && readFileSync(SESSION_FILE, "utf8").includes(kept);

  // Reopened, the app is still signed in and reads once, by itself. The undo kept on disk is still
  // offered. Its clock is in Hiroba's daily break, and a write then sends nothing at all.
  const readsBeforeReopen = await myPageHits();
  const platesBeforeReopen = (await platesSettled()).length;
  const myDonsBeforeReopen = await myDonsSettled();
  const medalPlatesBeforeReopen = await medalPlatesSettled();
  const thumbsBeforeReopen = (await thumbsSettled()).length;
  await stop(running);
  running = await launch({ writes: true, now: IN_THE_BREAK });
  await running.until("サンプルどん");
  results.signedInAfterReopen = true;
  results.readsOnReopen = (await myPageHits()) - readsBeforeReopen;
  results.undoOfferedAfterReopen = await waitFor(
    async () =>
      (await running.page.evaluate<boolean>(`document.querySelector("#costume-undo") !== null`)) ||
      undefined,
  );
  // The read shows the title plate too, kept on disk since the first launch, and asks Hiroba for
  // none: once it is shown, nothing more is on its way.
  await waitForSeen(
    running.page,
    async () =>
      (await running.page.evaluate<boolean>(
        `document.querySelector("#title-plate-image") !== null`,
      )) || undefined,
  );
  results.plateOncePerDevice = (await platesSettled()).length === platesBeforeReopen;
  // So does the My Don: the launch's read is the session's first, which renews nothing.
  const myDonShownOn = (app: typeof running) =>
    waitForSeen(
      app.page,
      async () =>
        (await app.page.evaluate<boolean>(`document.querySelector("#my-don-image") !== null`)) ||
        undefined,
    );
  await myDonShownOn(running);
  results.myDonOncePerLaunch = (await myDonsSettled()) === myDonsBeforeReopen;
  /** Scrolls to the どんメダル plate, waits for its picture, and scrolls back to the top. */
  const medalPlateShown = async () => {
    await running.page.evaluate(
      `document.querySelector("#medal").scrollIntoView({ block: "center" })`,
    );
    await waitForSeen(
      running.page,
      async () =>
        (await running.page.evaluate<boolean>(
          `document.querySelector("#medal-plate-image") !== null`,
        )) || undefined,
    );
    const fetched = await medalPlatesSettled();
    await running.page.evaluate("window.scrollTo(0, 0)");
    return fetched;
  };
  // So does the どんメダル plate, once its card is on screen.
  results.medalPlateOncePerDevice = (await medalPlateShown()) === medalPlatesBeforeReopen;
  await resetLog();
  const inTheBreak = await running.page.evaluate(
    `window.abth.changeCostume(${JSON.stringify({ expected: { ...START, colorFace: 7 }, target: START })})`,
  );
  results.breakSendsNothing =
    same(inTheBreak, { kind: "maintenance" }) && same(await requestLog(), []);
  // The editor's items show the thumbnails kept on disk, and ask Hiroba for none: the きぐるみ
  // slot's, seen on the first launch, and the second slot's, which came on reopening it there.
  const shownOnReopen = (selector: string) =>
    running.page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await running.click("#costume-open");
  await waitFor(async () => (await shownOnReopen("#costume-tab-items")) || undefined);
  await running.click("#costume-tab-items");
  await waitForSeen(
    running.page,
    async () => (await shownOnReopen("#item-costume1-4 img")) || undefined,
  );
  await running.click("#costume-part-costume2");
  await waitForSeen(
    running.page,
    async () => (await shownOnReopen("#item-costume2-21 img")) || undefined,
  );
  results.thumbnailsOncePerDevice = (await thumbsSettled()).length === thumbsBeforeReopen;
  await running.click("#costume-close");
  await waitFor(async () => ((await shownOnReopen("#costume-dialog")) ? undefined : true));

  await running.click("#sign-out");
  await running.until("Sign in to Hiroba");
  results.signOutHandled = !existsSync(SESSION_FILE);

  // Reopened after signing out, it stays signed out and asks Hiroba nothing. Started without
  // ABTH_UNVERIFIED_WRITES, it may send no write, and one asked for anyway sends nothing.
  const readsBeforeSecondReopen = await myPageHits();
  await stop(running);
  running = await launch({ writes: false, now: NOON_JST });
  await running.until("Sign in to Hiroba");
  await Bun.sleep(500);
  results.signedOutAfterReopen = (await myPageHits()) === readsBeforeSecondReopen;
  await resetLog();
  const shut = await running.page.evaluate(
    `Promise.all([window.abth.enabledWrites(), window.abth.pendingUndo(), window.abth.changeCostume(${JSON.stringify({ expected: START, target: { ...START, colorFace: 3 } })}), window.abth.undo("costume")])`,
  );
  results.gateShutWithoutTheFlag =
    same(shut, [[], [], { kind: "notEnabled" }, { kind: "notEnabled" }]) &&
    same(await requestLog(), []);
  // Signed in, the card shows the editor's button shut, and says why, rather than no way to change
  // anything at all. Signed out again after, so the session is not left for the scan below.
  const platesSignedOut = (await platesAsked()).length;
  const myDonsSignedOut = (await myDonsAsked()).length;
  const medalPlatesSignedOut = await hitsOn(MEDAL_PLATE);
  const thumbsSignedOut = (await thumbs()).length;
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  results.shutGateSaysWhy =
    (await running.page.evaluate<boolean>(
      `document.querySelector("#costume-open")?.disabled === true`,
    )) &&
    (await running.textOf("#costume-not-open")) ===
      "Not open in this build yet: the first real costume change from the app has still to be made and checked.";
  // Signed out on the last launch and in again on this one, the plate and the thumbnails kept on
  // disk are still there, and Hiroba is asked for none of them (the user's call, 2026-09-28: no
  // picture is deleted at sign-out). This build opens no editor, so a thumbnail is asked for through
  // the bridge, after the editor's read that offers it.
  await waitForSeen(
    running.page,
    async () =>
      (await running.page.evaluate<boolean>(
        `document.querySelector("#title-plate-image") !== null`,
      )) || undefined,
  );
  const keptThumbnail = await running.page.evaluate<{ ok: boolean }>(
    `window.abth.openCostumeEditor().then(() => window.abth.readPicture({ kind: "costumeItem", slot: 1, id: 4 }))`,
  );
  results.picturesSurviveSignOut =
    keptThumbnail.ok &&
    (await platesSettled()).length === platesSignedOut &&
    (await thumbs()).length === thumbsSignedOut;
  results.medalPlateSurvivesSignOut = (await medalPlateShown()) === medalPlatesSignedOut;
  // The My Don kept on disk too: a sign-in's read is its session's first, which renews nothing.
  await myDonShownOn(running);
  results.myDonKeptAtSignIn = (await myDonsSettled()) === myDonsSignedOut;
  // Signed out and in again, in the same run. A plate no later read has confirmed is not kept:
  // Hiroba draws a blank one for a session it ended unseen, so it is asked for again. Once a read
  // has confirmed it, it is kept, and the read after the next sign-in asks Hiroba for no plate
  // (the user's call, 2026-09-28: no picture is deleted at sign-out). Tried on a title no launch
  // has worn yet: every plate a read confirmed is kept on disk.
  const plateShown = () =>
    waitForSeen(
      running.page,
      async () =>
        (await running.page.evaluate<boolean>(
          `document.querySelector("#title-plate-image") !== null`,
        )) || undefined,
    );
  /** The plates asked for this run, once signed out and in again and the plate is shown. */
  const platesAfterSignOutAndIn = async () => {
    await running.click("#sign-out");
    await running.until("Sign in to Hiroba");
    await running.click("#sign-in");
    await running.until("サンプルどん");
    tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
    await plateShown();
    return (await platesSettled()).length;
  };
  const platesBeforeThird = (await platesSettled()).length;
  await fetch(`${HIROBA}/__variant?title=third`);
  await running.click("#read-again");
  await running.until("三つ目のサンプル称号");
  await waitFor(async () => (await platesAsked()).length > platesBeforeThird || undefined);
  await plateShown();
  const platesUnconfirmed = (await platesSettled()).length;
  results.unconfirmedPlateAskedAgain = (await platesAfterSignOutAndIn()) === platesUnconfirmed + 1;
  await running.click("#read-again");
  await Bun.sleep(300);
  await running.until("Read at");
  const platesBeforeSignOut = (await platesSettled()).length;
  results.playerPicturesKeptAtSignOut = (await platesAfterSignOutAndIn()) === platesBeforeSignOut;
  await running.click("#sign-out");
  await running.until("Sign in to Hiroba");
  tokens.push(...((await (await fetch(`${HIROBA}/__tickets`)).json()) as string[]));
  // Every portrait this run asked for went to the picture host as my page's src names it, with
  // Hiroba's origin alone as the Referer, and with no cookie at all: the session is Hiroba's.
  const portraits = await myDonsAsked();
  results.myDonSentNoCookie =
    portraits.length > 3 &&
    portraits.every(
      (portrait) =>
        portrait.cookies.length === 0 &&
        portrait.referer === `${HIROBA}/` &&
        portrait.query === "?v=&kind=mydon&fn=mydon_000000000000",
    );
} finally {
  await stop(running);
  mock.kill();
}

/**
 * Starts the app on the stand-in and attaches to its window over the DevTools protocol. `writes`
 * opens the gate for writes not yet verified; `now` fixes the clock a write checks Hiroba's daily
 * break against. Every run keeps what it reads in the debug folder, so the scan below covers it.
 *
 * A window other windows cover counts as hidden on Windows, and a hidden page sees nothing, so it
 * asks for no picture: the switch keeps the window seen however it is covered. `--lang` gives the
 * app its system language: English unless a check asks for another, since the checks read its
 * English words. `userData` is where the app keeps what it keeps.
 */
async function launch({
  writes,
  now,
  lang = "en-US",
  userData = USER_DATA,
}: {
  writes: boolean;
  now: string;
  lang?: string;
  userData?: string;
}) {
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    "--disable-backgrounding-occluded-windows",
    `--lang=${lang}`,
  ];
  const proc = Bun.spawn([String(electronPath), root, ...args], {
    env: {
      ...process.env,
      ABTH_DEV_HIROBA_ORIGIN: HIROBA,
      ABTH_DEV_IDP_HOST: IDP_HOST,
      ABTH_DEV_IMG_ORIGIN: IMG,
      ABTH_DEV_USER_DATA: userData,
      ABTH_DEV_NOW: now,
      ABTH_DEBUG_SAVE_READS: "1",
      ...(writes ? { ABTH_UNVERIFIED_WRITES: "1" } : { ABTH_UNVERIFIED_WRITES: "" }),
    },
    stdout: "ignore",
    stderr: "ignore",
  });
  const target = await waitFor(async () => {
    const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    return list.find((t) => t.url.startsWith("app://gui/"));
  });
  const page = await connect(target.webSocketDebuggerUrl);
  const text = () => page.evaluate<string>("document.body.textContent");
  /** One element's text, or null when nothing on the page matches the selector. */
  const textOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`,
    );
  const click = (selector: string) =>
    page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const clickButton = (label: string) =>
    page.evaluate(
      `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`,
    );
  const until = (needle: string) =>
    waitFor(async () => (await text()).includes(needle) || undefined);
  return { proc, page, text, textOf, click, clickButton, until };
}

/**
 * Closes the app the way a user does, through the browser's own close, so it shuts down and saves
 * its state; only an app that has not gone after ten seconds is killed.
 */
async function stop(app: { proc: ReturnType<typeof Bun.spawn> }) {
  try {
    const version = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()) as {
      webSocketDebuggerUrl: string;
    };
    const browser = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => browser.addEventListener("open", resolve, { once: true }));
    browser.send(JSON.stringify({ id: 1, method: "Browser.close" }));
  } catch {
    // Already gone, or never came up: the kill below settles it.
  }
  const exited = await Promise.race([
    app.proc.exited.then(() => true),
    Bun.sleep(10_000).then(() => false),
  ]);
  if (!exited) {
    app.proc.kill();
    await app.proc.exited;
  }
}

const hits: string[] = [];
for (const file of walk(USER_DATA)) {
  const bytes = readFileSync(file).toString("latin1");
  if (
    tokens.some((t) => t !== "" && bytes.includes(t)) ||
    bytes.includes("_token_v2") ||
    bytes.includes(IDP_MARKER) ||
    bytes.includes("abth_mock_idp")
  ) {
    hits.push(file.slice(USER_DATA.length));
  }
}
results.userDataHits = hits;
results.partitionsFolder = readdirSync(USER_DATA).includes("Partitions");
// The editor page kept for debugging holds its form token replaced, and the undo file holds none.
const savedEditor = join(USER_DATA, "debug", "mypage_kisekae.php.html");
results.debugReadsRedacted =
  existsSync(savedEditor) && readFileSync(savedEditor, "utf8").includes(`value="<tckt>"`);
results.undoKeptOnDisk = existsSync(join(USER_DATA, "undo.json"));
// The pictures on disk are named by hashes alone, the thumbnails as shared art and the plates under
// their player: no taiko number and no title in any name.
const PICTURES = join(USER_DATA, "pictures");
const pictureFiles = (existsSync(PICTURES) ? [...walk(PICTURES)] : []).map((file) =>
  file.slice(PICTURES.length).split(sep).join("/"),
);
const HASH = "[0-9a-f]{64}";
const filedAs = (pattern: string) => new RegExp(`^/${PICTURE_EPOCH}/${pattern}\\.png$`);
results.picturesFiledUnderHashes =
  pictureFiles.some((file) => filedAs(`shared/${HASH}`).test(file)) &&
  pictureFiles.some((file) => filedAs(`player/${HASH}/${HASH}`).test(file)) &&
  pictureFiles.every((file) => filedAs(`(shared|player/${HASH})/${HASH}`).test(file));
// The どんメダル plate ids stay in main: none is in the name of any file the app keeps, and none is
// in any file but the debug copies of the pages that showed them.
const inDebugCopies = (file: string) => file.slice(USER_DATA.length).split(sep)[1] === "debug";
results.medalIdsKeptOffDisk =
  medalIds.length === 2 &&
  [...walk(USER_DATA)].every((file) => {
    const bytes = readFileSync(file).toString("latin1");
    return medalIds.every(
      (id) => !file.includes(id) && (inDebugCopies(file) || !bytes.includes(id)),
    );
  });
console.log(JSON.stringify(results, null, 2));

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

/**
 * Waits for what the page asks for only once it is seen, such as a picture. A hidden page sees
 * nothing, so a hidden window fails at once, saying so, rather than at the wait's timeout.
 */
async function waitForSeen<T>(
  page: { evaluate<V>(expression: string): Promise<V> },
  probe: () => Promise<T | undefined>,
): Promise<T> {
  const visibility = await page.evaluate<string>("document.visibilityState");
  if (visibility !== "visible") {
    throw new Error(`The window is ${visibility}: it asks for no picture until it is seen`);
  }
  return waitFor(probe);
}

async function waitFor<T>(probe: () => Promise<T | undefined>, timeoutMs = 30_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value !== undefined) {
        return value;
      }
    } catch {
      // Not up yet.
    }
    await Bun.sleep(200);
  }
  throw new Error(`Timed out after ${timeoutMs} ms`);
}

async function connect(url: string) {
  const socket = new WebSocket(url);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let nextId = 1;
  const waiting = new Map<number, (value: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: { result?: { value?: unknown } };
    };
    if (message.id !== undefined) {
      waiting.get(message.id)?.(message.result?.result?.value);
      waiting.delete(message.id);
    }
  });
  /** Sends one DevTools command; resolves with the value it evaluated to, if it evaluated one. */
  const send = <T = unknown>(method: string, params: Record<string, unknown>): Promise<T> => {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => waiting.set(id, resolve as (value: unknown) => void));
  };
  return {
    send,
    evaluate<T = unknown>(expression: string): Promise<T> {
      return send<T>("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    },
  };
}
