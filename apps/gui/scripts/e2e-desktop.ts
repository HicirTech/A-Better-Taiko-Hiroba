/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again (a small Fab, shut and
 * spinning while a read runs, and on a touch-first screen a pull from the top of the page, neither
 * of them inside a write), a rotated session,
 * every どんメダル state, a dan-less, title-less, region-less my page, a set favourite song and a
 * filled favourites folder, the Overview shaped like my page's header, the identity card on
 * Hiroba's title plate (its text over it, one plate per title, one that does not come, the plate
 * kept across sign-outs and launches), Hiroba's score panel (a stand-in while its art does not
 * come, asked for again after each read until it does, the counts written over the art where my
 * page writes them, the art kept across launches and sign-outs), the My Don
 * portrait (a button to the Costume page, with an edit badge and its name on hover, reached by a
 * click, by Enter and Space, on a touch-first screen too, and there by a long-press alone, not a
 * tap or a moved finger, from the picture host with no cookie, a first one that does not come coded
 * and asked for again after a read, kept across launches and sign-ins, fetched anew on Read again
 * and after a write applies, the kept one still shown when a fresh one does not come), the
 * どんメダル plate (asked for only on screen, its words over it, one plate per season and state,
 * one that does not come, its id never in the window or on disk, the plate kept across sign-outs and
 * launches), the Costume page (in the side panel and the menu between the Overview and Favourites;
 * the editor read once when the page is first shown in a run, never at start-up or on a reopen,
 * and read again from the Fab or a pull there, not my page; a draft that survives a visit to
 * another page, and Reset; the Save bar at the window's bottom edge; a column on a wide window),
 * the editor's picture of the set (on the page's first showing, after a pick, one request for a
 * burst of picks, one that does not come, none away from the page, none inside a write), its
 * items' thumbnails (only those seen, each once, kept across sign-outs and launches, one that does
 * not come, one not offered, shapes the bridge refuses, none inside a write, and a grid that has
 * scrolled left to scroll back under a finger, with no pull), the pictures on disk named by
 * hashes alone, costume writes (a colour and a きぐるみ, each undone from the page, the #22 trap, a
 * save that moves nothing, pre-checks that stop, a post sent to the login page, an undo after a
 * change made elsewhere, and a session that ends before and after a save), a lost session (none of
 * its pictures shown at the next sign-in), cancel, a sign-in sent off both
 * sites, the pages (a side panel on a wide window, a menu on a narrow one, the sign-in card on the
 * Overview, Costume and Favourites while signed out, the favourites on their own page, and the page
 * kept for the next launch), the scheme (dark or light as the system asks, the page's
 * color-scheme with it), Settings (sections with small headings over lists of rows, who is signed
 * in, while a read runs too, and Sign out, shut while it does), the
 * language (radio buttons the arrows move, the system's at first, a pick in Settings that takes
 * hold at once and is kept, System default, which follows the system again, and one made while signed in,
 * which asks Hiroba nothing), a reopen that keeps the
 * session and the undo,
 * Hiroba's daily break, sign-out, and a reopen that stays signed out, sends no write while it is,
 * and, signed in, opens the Costume page's editor with no flag set at all, against
 * scripts/mock-hiroba.ts, over the
 * Chrome DevTools Protocol. It counts the reads the mock saw and checks each write sent exactly the requests
 * planned, then searches the app's user-data folder for every session token and form token the
 * mock issued and for what the mock ID host left behind. Run `bun run build` first.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { createTranslator } from "@abth/i18n";
import electronPath from "electron";

import { PICTURE_EPOCH } from "../src/hiroba-session";
import { LONG_PRESS_MS } from "../src/my-page/use-long-press";
import { BRIDGE_CHANNELS, type VerbsQueued } from "../src/session-port";
import {
  COSTUME_FIELDS,
  type CostumeState,
  INITIAL_COSTUME,
  type PostRecord,
} from "./mock-costume";
import {
  COOLDOWN_MESSAGE,
  FILTER_MESSAGE,
  INITIAL_PROFILE,
  OWNED_TITLES,
  REFUSED_NAME,
} from "./mock-profile";

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
/** The art of the score panel the mock's my page shows. */
const PANEL_ART = "/image/sp/640/total_score_image_5.png";
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
 * and, after each read of my page, the title plate, the score panel's art, the どんメダル plate and
 * the My Don.
 */
const LANE_PICTURES: readonly string[] = [
  THUMBNAIL,
  TITLE_PLATE,
  `GET ${PANEL_ART}`,
  TOKEN_PLATE,
  MY_DON,
];
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
 * A colour change's requests: the editor, the pre-check, one save, the read-back. The desktop's
 * costume writes have been made for real, so they read no other page (LIVE_CHECKED_WRITES).
 */
const WRITE_REQUESTS = [
  "GET /mypage_kisekae.php",
  "POST /ajax/check_ip_kisekae.php",
  "POST /ajax/change_mydon.php",
  "GET /mypage_kisekae.php",
];

// The language, in runs of their own, signed out. Opened on a system in Traditional Chinese, the
// app is in it, and says so to the page; a pick in Settings, of the language shown or another,
// takes hold at once and is kept for the next launch, which the system's language no longer decides.
// So is the page shown last: the next launch opens on Settings. System default forgets the pick:
// the system's language decides again, at once and at the next launch.
const en = createTranslator("en");
const ja = createTranslator("ja");
const zhHant = createTranslator("zh-Hant");
/** The system's choice in Settings while the app follows a system in 繁體中文. */
const SYSTEM_ZH_HANT = zhHant.t("language.system", { name: "繁體中文" });
/**
 * What says which language the window is in: `lang`, the title, the navigation, and the choice
 * checked in Settings.
 */
const languageShown = (page: Awaited<ReturnType<typeof launch>>["page"]) =>
  page.evaluate<Record<string, string | null>>(
    `({ lang: document.documentElement.lang, title: document.title, overview: document.querySelector("#nav-overview")?.textContent ?? null, checked: document.querySelector("#language-setting input:checked")?.closest("label")?.textContent ?? null })`,
  );
rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
await resetLog();
let inLanguage = await launch({
  now: NOON_JST,
  lang: "zh-TW",
  userData: LANGUAGE_USER_DATA,
});
try {
  await inLanguage.until(zhHant.t("signIn.action"));
  await inLanguage.goTo("settings");
  results.systemLanguageTaken = same(await languageShown(inLanguage.page), {
    lang: "zh-Hant",
    title: "A Better Taiko Hiroba",
    overview: zhHant.t("nav.overview"),
    checked: SYSTEM_ZH_HANT,
  });
  // One radio button per choice, in one group named by the section's heading: the system's
  // language first, in the app's words, then each language named in its own words and marked with
  // it, in the catalog's order.
  const listed = await inLanguage.page.evaluate<string[][]>(
    `[...document.querySelectorAll('#language-setting [role="radiogroup"] li label')].filter((label) => label.querySelector('input[type="radio"]') !== null).map((label) => [label.lang, label.textContent])`,
  );
  const groupName = await inLanguage.page.evaluate<string | null>(
    `(() => { const group = document.querySelector('#language-setting [role="radiogroup"]'); return document.getElementById(group?.getAttribute("aria-labelledby") ?? "")?.textContent ?? null; })()`,
  );
  results.choicesNameEachLanguage =
    groupName === zhHant.t("settings.language") &&
    same(listed, [
      ["", SYSTEM_ZH_HANT],
      ["en", "English"],
      ["ja", "日本語"],
      ["zh-Hans", "简体中文"],
      ["zh-Hant", "繁體中文"],
    ]);
  // A pick of the language already shown is a pick too: a system in another one no longer decides.
  await inLanguage.click("#language-zh-Hant");
  await stop(inLanguage);
  inLanguage = await launch({
    now: NOON_JST,
    lang: "en-US",
    userData: LANGUAGE_USER_DATA,
  });
  await waitFor(async () => (await inLanguage.textOf("#language-setting")) ?? undefined);
  results.pageKeptAcrossLaunches =
    (await inLanguage.currentPage()) === "settings" &&
    (await inLanguage.textOf("#sign-in")) === null;
  const kept = await languageShown(inLanguage.page);
  results.shownLanguagePickKept = same([kept.lang, kept.checked], ["zh-Hant", "繁體中文"]);
  await inLanguage.click("#language-ja");
  await inLanguage.until(ja.t("settings.account"));
  results.pickTakesHold = same(await languageShown(inLanguage.page), {
    lang: "ja",
    title: "A Better Taiko Hiroba",
    overview: ja.t("nav.overview"),
    checked: "日本語",
  });
  await stop(inLanguage);
  inLanguage = await launch({
    now: NOON_JST,
    lang: "zh-TW",
    userData: LANGUAGE_USER_DATA,
  });
  await inLanguage.until(ja.t("settings.account"));
  results.pickKeptAcrossLaunches =
    (await languageShown(inLanguage.page)).lang === "ja" && same(await requestLog(), []);
  await inLanguage.click("#language-system");
  await inLanguage.until(zhHant.t("settings.account"));
  results.systemDefaultTakesHold = same(await languageShown(inLanguage.page), {
    lang: "zh-Hant",
    title: "A Better Taiko Hiroba",
    overview: zhHant.t("nav.overview"),
    checked: SYSTEM_ZH_HANT,
  });
  await stop(inLanguage);
  inLanguage = await launch({
    now: NOON_JST,
    lang: "en-US",
    userData: LANGUAGE_USER_DATA,
  });
  await inLanguage.until(en.t("settings.account"));
  results.systemDefaultKeptAcrossLaunches =
    same(await languageShown(inLanguage.page), {
      lang: "en",
      title: "A Better Taiko Hiroba",
      overview: en.t("nav.overview"),
      checked: en.t("language.system", { name: "English" }),
    }) && same(await requestLog(), []);
  // From the keyboard, the arrows move the check from choice to choice, as a radio group's do, and
  // each takes hold as a click does.
  const ARROW_DOWN = { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 };
  const arrowDown = async () => {
    await inLanguage.page.send("Input.dispatchKeyEvent", { type: "keyDown", ...ARROW_DOWN });
    await inLanguage.page.send("Input.dispatchKeyEvent", { type: "keyUp", ...ARROW_DOWN });
  };
  await inLanguage.page.evaluate(
    `document.querySelector("#language-setting input:checked").focus()`,
  );
  await arrowDown();
  const checkedByArrow = await waitFor(async () => {
    const shown = await languageShown(inLanguage.page);
    return shown.checked === "English" ? shown.lang : undefined;
  });
  await arrowDown();
  await inLanguage.until(ja.t("settings.account"));
  results.choicesMoveByArrows =
    checkedByArrow === "en" && same((await languageShown(inLanguage.page)).checked, "日本語");
} finally {
  await stop(inLanguage);
  rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
}

let running = await launch({ now: NOON_JST });
try {
  const { page, text, textOf, click, clickButton, until, currentPage, goTo } = running;
  const exists = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  const attribute = (selector: string, name: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`,
    );
  await until("Sign in to Hiroba");

  // The pages, signed out, with no header at all (the user's call, 2026-09-29): on a window this
  // wide, a side panel like Gmail's, the product's name small at its top, then each page, the one
  // shown marked. The Overview, Costume, Name & title and Favourites show the sign-in card;
  // Settings works, with the language and the note on staying signed in, no one signed in and no
  // way to sign out.
  const NAVIGATION = [
    "A Better Taiko Hiroba",
    "Overview",
    "Costume",
    "Name & title",
    "Favourites",
    "Settings",
  ].join("");
  const shownSignedOut: boolean[] = [];
  for (const each of ["costume", "nameTitle", "favorites", "settings", "overview"] as const) {
    await goTo(each);
    shownSignedOut.push(
      each === "settings"
        ? (await exists("#language-setting")) &&
            (await exists("#sign-out-note")) &&
            (await textOf("#account-who")) === "Not signed in" &&
            !(await exists("#sign-out")) &&
            !(await exists("#sign-in"))
        : (await exists("#sign-in-card #sign-in")) && !(await exists("#language-setting")),
    );
  }
  results.navigationShown =
    (await textOf("nav")) === NAVIGATION &&
    (await textOf("main h1")) === "Overview" &&
    !(await exists("header")) &&
    !(await exists("#nav-menu")) &&
    shownSignedOut.every(Boolean);
  // The Costume page (the user's call, 2026-10-02) is the second of the pages, and Name & title the
  // third, a pencil beside its name, between the Overview and Favourites, each with its icon.
  const entriesIn = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${selector} [id^="nav-"]`)})].map((entry) => entry.id + (entry.querySelector("svg") === null ? ":no-icon" : ""))`,
    );
  const PAGE_ENTRIES = [
    "nav-overview",
    "nav-costume",
    "nav-nameTitle",
    "nav-favorites",
    "nav-settings",
  ];
  const sidePanelEntries = await entriesIn("nav");
  await goTo("costume");
  const costumeShownSignedOut = (await textOf("main h1")) === "Costume";
  await goTo("nameTitle");
  const nameTitleShownSignedOut =
    (await textOf("main h1")) === "Name & title" && (await exists("#sign-in-card #sign-in"));
  await goTo("overview");

  // The page follows the system's scheme, and its color-scheme with it, so the scrollbars and the
  // system's own widgets are dark on a dark page and light on a light one.
  const shownIn = async (scheme: "dark" | "light") => {
    await page.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
    await waitFor(
      async () =>
        (await page.evaluate<string>("getComputedStyle(document.documentElement).colorScheme")) ===
          scheme || undefined,
      5_000,
    );
    return page.evaluate<string>("getComputedStyle(document.body).backgroundColor");
  };
  const darkBackground = await shownIn("dark");
  const lightBackground = await shownIn("light");
  await page.send("Emulation.setEmulatedMedia", { features: [] });
  results.schemeFollowsSystem =
    darkBackground === "rgb(18, 18, 18)" && lightBackground === "rgb(255, 255, 255)";

  // On a narrow window (below MUI's md), a menu button floats at the top left instead, clear of
  // the page, named for screen readers. From the keyboard it opens the same pages in a drawer; a
  // pick closes it on its page, and so do Escape and a tap outside it, the focus going back to it.
  const KEYS = {
    Enter: { code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
    Escape: { code: "Escape", windowsVirtualKeyCode: 27 },
  } as const;
  const press = async (key: keyof typeof KEYS) => {
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, ...KEYS[key] });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: KEYS[key].code });
  };
  const menuOpened = async () => {
    await page.evaluate(`document.querySelector("#nav-menu").focus()`);
    await press("Enter");
    return waitFor(async () => (await exists("#nav-favorites")) || undefined);
  };
  const menuClosed = () =>
    waitFor(async () => ((await exists("#nav-overview")) ? undefined : true));
  const bottomOf = (selector: string) =>
    page.evaluate<number>(
      `document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().bottom`,
    );
  const topOf = (selector: string) =>
    page.evaluate<number>(
      `document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top`,
    );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 800,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await waitFor(async () => (await exists("#nav-menu")) || undefined);
  const menuFloats =
    !(await exists("nav")) &&
    (await attribute("#nav-menu", "aria-label")) === "Menu" &&
    (await attribute("#nav-menu", "aria-expanded")) === "false" &&
    (await bottomOf("#nav-menu")) <= (await topOf("#sign-in-card"));
  await menuOpened();
  const drawerShown =
    (await textOf("nav")) === NAVIGATION &&
    (await attribute("#nav-menu", "aria-expanded")) === "true" &&
    (await currentPage()) === "overview";
  const drawerEntries = await entriesIn("nav");
  await click("#nav-costume");
  await menuClosed();
  const costumePicked = (await textOf("main h1")) === "Costume" && (await exists("#sign-in"));
  await menuOpened();
  const costumeMarked = (await currentPage()) === "costume";
  await click("#nav-nameTitle");
  await menuClosed();
  const nameTitlePicked =
    (await textOf("main h1")) === "Name & title" && (await exists("#sign-in"));
  await menuOpened();
  const nameTitleMarked = (await currentPage()) === "nameTitle";
  await click("#nav-favorites");
  await menuClosed();
  const pickTaken = (await textOf("main h1")) === "Favourites" && (await exists("#sign-in"));
  await menuOpened();
  const pickMarked = (await currentPage()) === "favorites";
  await press("Escape");
  await menuClosed();
  const focusBack = await waitFor(
    async () =>
      (await page.evaluate<string | undefined>("document.activeElement?.id")) === "nav-menu" ||
      undefined,
  );
  await menuOpened();
  await click(".MuiBackdrop-root");
  await menuClosed();
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  await waitFor(async () => (await exists("#nav-overview")) || undefined);
  results.menuOnNarrowWindow =
    menuFloats &&
    drawerShown &&
    pickTaken &&
    pickMarked &&
    focusBack &&
    (await textOf("main h1")) === "Favourites" &&
    !(await exists("#nav-menu"));
  results.costumePageInNavigation =
    same(sidePanelEntries, PAGE_ENTRIES) &&
    same(drawerEntries, PAGE_ENTRIES) &&
    costumeShownSignedOut &&
    costumePicked &&
    costumeMarked;
  results.nameTitlePageInNavigation =
    same(sidePanelEntries, PAGE_ENTRIES) &&
    same(drawerEntries, PAGE_ENTRIES) &&
    nameTitleShownSignedOut &&
    nameTitlePicked &&
    nameTitleMarked;
  await goTo("overview");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );
  // The window gets the port's verbs, each with its channel, and nothing else.
  results.bridgeIsThePortVerbs = same(
    (results.surface as { bridge: string[] }).bridge,
    Object.keys(BRIDGE_CHANNELS),
  );

  // The player's first My Don ever does not come: checked under the plate, below. Nor does the score
  // panel's art, which the mock answers with a 404 for now.
  await fetch(`${HIROBA}/__mydon?answer=gif`);
  await fetch(`${HIROBA}/__panel?answer=404`);
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
    ["White Iki", "3.9%", 4],
    ["Bronze Iki", "8.8%", 9],
    ["Silver Iki", "17.6%", 18],
    ["Gold Miyabi", "30.4%", 31],
    ["Pink Miyabi", "24.5%", 25],
    ["Purple Miyabi", "11.8%", 12],
    ["Rainbow Kiwami", "2.9%", 3],
  ];
  const CROWN_SHARES: readonly Share[] = [
    ["Clear", "78.6%", 11],
    ["Full Combo", "14.3%", 2],
    ["Donderful Combo", "7.1%", 1],
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
    (await textOf("#dan")) === "Dan-i: 9th Dan" && (await textOf("#dan-unreadable")) === null;
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
    (await textOf("#dan")) === "Dan-i: 9th Dan" &&
    (await textOf("#title-plate-stand-in")) === null &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  // The plate sits on the app's own surface (the user's call, 2026-09-28): nothing from it up to
  // the card paints the yellow Hiroba draws around it, #FFCC00.
  results.plateOnAppSurface = await page.evaluate<boolean>(
    `(() => { const colours = []; for (let box = document.querySelector("#title-plate"); box !== null; box = box.parentElement) { colours.push(getComputedStyle(box).backgroundColor); if (box.id === "profile") return !colours.includes("rgb(255, 204, 0)"); } return false; })()`,
  );
  results.danLabelShownAsPicture =
    (await attribute("#dan-label", "src"))?.startsWith("data:image/png;base64,") === true;

  // The Overview's header is shaped like my page's (the user's call, 2026-09-29): the My Don on the
  // left, the plate on the right and Hiroba's score panel under it, with no background art and none
  // of Hiroba's yellow; on a narrow window, the portrait, the plate and the panel one under another.
  const boxOf = (selector: string) =>
    page.evaluate<{ left: number; top: number; right: number; bottom: number; width: number }>(
      `(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width }; })()`,
    );
  const headerBoxes = async () => ({
    myDon: await boxOf("#my-don"),
    plate: await boxOf("#title-plate"),
    panel: await boxOf("#score-panel"),
  });
  const wide = await headerBoxes();
  const plainSurface = await page.evaluate<boolean>(
    `(() => { for (let box = document.querySelector("#overview-header"); box !== null && box.id !== "profile"; box = box.parentElement) { const style = getComputedStyle(box); if (style.backgroundColor === "rgb(255, 204, 0)" || style.backgroundImage !== "none") return false; } return true; })()`,
  );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 800,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await waitFor(async () => (await exists("#nav-menu")) || undefined);
  const narrow = await headerBoxes();
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  await waitFor(async () => (await exists("#nav-overview")) || undefined);
  results.overviewShapedLikeMyPage =
    wide.myDon.right <= wide.plate.left &&
    Math.abs(wide.myDon.top - wide.plate.top) < 1 &&
    wide.plate.bottom <= wide.panel.top &&
    wide.panel.left > wide.myDon.right &&
    narrow.myDon.bottom <= narrow.plate.top &&
    narrow.plate.bottom <= narrow.panel.top &&
    Math.abs(narrow.myDon.left + narrow.myDon.right - narrow.plate.left - narrow.plate.right) < 2 &&
    plainSurface;
  // The panel's art did not come: a plain panel of its geometry stands in. Every count is written
  // where my page writes it, as text, after its name for screen readers, which the art shows everyone
  // else, and the line under the header names the portrait, the first picture that did not come.
  type PanelCount = readonly [id: string, name: string, count: string, left: number, top: number];
  const PANEL_COUNTS: readonly PanelCount[] = [
    ["rank-8", "Rainbow Kiwami", "3", 230, 18],
    ["rank-5", "Gold Miyabi", "31", 57, 54],
    ["rank-6", "Pink Miyabi", "25", 141, 54],
    ["rank-7", "Purple Miyabi", "12", 230, 54],
    ["rank-2", "White Iki", "4", 57, 85],
    ["rank-3", "Bronze Iki", "9", 141, 85],
    ["rank-4", "Silver Iki", "18", 230, 85],
    ["crowns-silver", "Clear", "11", 57, 121],
    ["crowns-gold", "Full Combo", "2", 141, 121],
    ["crowns-donderful", "Donderful Combo", "1", 230, 121],
  ];
  /** Whether each count is text after its name, where my page writes it on its 280-wide panel. */
  const panelCountsInPlace = async (counts: readonly PanelCount[]) => {
    const panel = await boxOf("#score-panel");
    const unit = panel.width / 280;
    const placed: boolean[] = [];
    for (const [id, , , left, top] of counts) {
      const count = await boxOf(`#score-panel-${id}`);
      placed.push(
        Math.abs((count.left - panel.left) / unit - left) < 1 &&
          Math.abs((count.top - panel.top) / unit - top) < 1,
      );
    }
    return (
      placed.every(Boolean) &&
      same(
        await allOf("#score-panel dt", "textContent"),
        counts.map(([, name]) => name),
      ) &&
      same(
        await allOf("#score-panel dd", "textContent"),
        counts.map(([, , count]) => count),
      ) &&
      same(
        await page.evaluate<string[]>(
          `[...document.querySelectorAll("#score-panel dd")].map((count) => count.id)`,
        ),
        counts.map(([id]) => `score-panel-${id}`),
      )
    );
  };
  results.scorePanelMissingStandsIn =
    (await hitsOn(PANEL_ART)) === 1 &&
    (await exists("#score-panel-stand-in")) &&
    !(await exists("#score-panel-image")) &&
    (await attribute("#score-panel", "aria-busy")) === "false" &&
    (await attribute("#score-panel", "role")) === "group" &&
    (await attribute("#score-panel", "aria-label")) === "Score panel" &&
    // The ranks' names are the page's language, so they carry no mark of their own.
    same(
      await page.evaluate<string[]>(
        `[...document.querySelectorAll("#score-panel dt")].slice(0, 7).map((name) => name.lang)`,
      ),
      Array(7).fill(""),
    ) &&
    (await panelCountsInPlace(PANEL_COUNTS)) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  const withPlate = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.headerAddressesKeptOutOfDom =
    !withPlate.includes("imgsrc") &&
    !withPlate.includes("titleplate") &&
    !withPlate.includes("taiko_no") &&
    !withPlate.includes("total_score") &&
    !withPlate.includes("000000000000") &&
    !withPlate.includes("_token_v2") &&
    !tokens.some((token) => withPlate.includes(token));
  const platesAtSignIn = await platesSettled();

  // The page's column, and the Fab at its right, stand still from page to page: the Overview,
  // which scrolls, and Settings, which does not, keep the scrollbar's room alike, and so does the
  // editor's dialog below, which stops the page scrolling while it is open.
  const column = () => boxOf("main .MuiContainer-root");
  type Column = Awaited<ReturnType<typeof column>>;
  const sameColumn = (one: Column, other: Column) =>
    Math.abs(one.left - other.left) < 1 && Math.abs(one.right - other.right) < 1;
  const overviewScrolls = await page.evaluate<boolean>(
    "document.documentElement.scrollHeight > window.innerHeight",
  );
  const columnOnOverview = await column();
  await goTo("settings");
  const columnOnSettings = await column();

  // Settings, signed in, laid out as Gmail's settings are: each section a small heading with its
  // icon, over one list of rows. The language's choices are radio buttons, one checked; the
  // account's row says who is signed in, with the note, and Sign out beside them, in the casing
  // of the app's other buttons, MUI's own.
  const settingsLayout = await page.evaluate<Record<string, unknown>>(
    `(() => { const sections = [...document.querySelectorAll("main section")]; const signOut = document.querySelector("#sign-out"); return { sections: sections.map((section) => [section.id, document.getElementById(section.getAttribute("aria-labelledby"))?.tagName ?? null, section.querySelector("h2 svg") !== null, section.querySelectorAll("ul").length]), radios: document.querySelectorAll('#language-setting li input[type="radio"]').length, checked: document.querySelectorAll("#language-setting input:checked").length, who: document.querySelector("#account-who")?.textContent ?? null, signOutBeside: signOut?.closest("li") === document.querySelector("#account-who")?.closest("li"), casing: signOut === null ? null : getComputedStyle(signOut).textTransform }; })()`,
  );
  results.settingsLaidOutLikeGmail = same(settingsLayout, {
    sections: [
      ["language-setting", "H2", true, 1],
      ["account", "H2", true, 1],
    ],
    radios: 5,
    checked: 1,
    who: "Signed in as サンプルどん",
    signOutBeside: true,
    casing: "uppercase",
  });
  await goTo("overview");

  // Picked in Settings while signed in, a language redraws the profile as it was read: counts,
  // percents and times in its own forms, Hiroba's words as they were, and nothing asked of Hiroba,
  // there or back, nor by going from page to page.
  const pickLanguage = async (locale: string) => {
    await goTo("settings");
    await click(`#language-${locale}`);
    await waitFor(
      async () =>
        (await page.evaluate<string>("document.documentElement.lang")) === locale || undefined,
    );
    await goTo("overview");
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
    (await textOf("#dan")) === ja.t("profile.dan", { dan: "九段" }) &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    /^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2} /.test(readAtInJapanese ?? "");
  await pickLanguage("en");
  await Bun.sleep(1000);
  results.languageAsksHirobaNothing =
    (await readHits()) === readsBeforeLanguage &&
    (await platesAsked()).length === platesBeforeLanguage &&
    (await textOf("#crowns-silver")) === "11 of 14";
  // Hiroba's own data says it is Japanese on a page in English: the nickname, the title and the
  // medal's name. The game's terms, the medal card's heading and the names of the ranks and the
  // crowns, are the page's language and carry no mark.
  const langOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.lang ?? null`,
    );
  results.hirobaWordsMarkedJapanese =
    (await langOf("#profile h2")) === "ja" &&
    (await textOf('#title-plate span[lang="ja"]')) === "サンプルの称号" &&
    (await langOf("#medal-name")) === "ja";
  results.gameTermsLeftUnmarked =
    (await textOf("#medal h2")) === "Don Medals" &&
    (await langOf("#medal h2")) === "" &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#ranks [lang], #crowns [lang]").length`,
    )) === 0;

  // Read again, from its Fab: one more request, no more.
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

  // The Costume page (the user's call, 2026-10-02). The portrait is the way there. The editor is
  // read once, when the page is first shown in a run: not at start-up, nor on the Overview, where
  // everything so far has been done without one request to it. Hiroba's picture of the set is
  // asked for only while the page is shown.
  const EDITOR = "/mypage_kisekae.php";
  const editorHits = () => hitsOn(EDITOR);
  /** Where the page's editor stands: unread, loading, editing, confirming, saving, undoing, done. */
  const stepOf = () =>
    page.evaluate<string | null>(`document.querySelector("#costume-page")?.dataset.step ?? null`);
  const inStep = (name: string) =>
    waitFor(async () => ((await stepOf()) === name ? true : undefined));
  const pressedOf = (selector: string) => attribute(selector, "aria-pressed");
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
  const editorReadsAtStart = await editorHits();
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#costume-open");
  await waitFor(async () => (await currentPage()) === "costume" || undefined);
  const jumpedByClick = (await textOf("main h1")) === "Costume";
  await inStep("editing");
  const onOpening = await previewOtherThan(null);
  await Bun.sleep(500);
  const previewsOnOpening = await previewQueries();
  const editorReadsOnOpening = await editorHits();
  results.portraitJumpsToCostumeByClick = jumpedByClick;
  results.editorNotReadAtStart = editorReadsAtStart === 0;
  results.previewShownOnOpen =
    onOpening.startsWith("data:image/png;base64,") &&
    same(previewsOnOpening, [previewQuery(START)]);
  // In this unpackaged run, with the old flag taken out of the environment, the Costume page is open
  // to change and no verb says whether writes are open. That a packaged exe or a release APK is open
  // too is not for a run to see: test/no-build-gate.test.ts lists every place the app looks at how
  // it was built.
  results.writesOpenWithNoFlag =
    (await exists("#costume-review")) &&
    (await page.evaluate<string>("typeof window.abth.enabledWrites")) === "undefined";

  // Away and back, the page finds the editor as it was: it is not read again, nor the picture of
  // the set asked for again.
  await goTo("overview");
  await goTo("costume");
  await inStep("editing");
  await Bun.sleep(500);
  results.editorReadOnceWhenOpened =
    editorReadsOnOpening === 1 && (await editorHits()) === 1 && (await stepOf()) === "editing";
  results.previewKeptBetweenVisits =
    (await previewSrc()) === onOpening && same(await previewQueries(), [previewQuery(START)]);

  // A draft survives a page switch, with the changes it lists; Reset puts back the set as read.
  const FACE_CHANGE = "Face: #5 → #3";
  await click("#swatch-colorFace-3");
  await goTo("overview");
  await goTo("costume");
  await inStep("editing");
  results.draftSurvivesAPageSwitch =
    (await pressedOf("#swatch-colorFace-3")) === "true" &&
    (await textOf("#costume-changes")) === FACE_CHANGE &&
    (await editorHits()) === 1;
  await click("#costume-reset");
  results.resetRestoresTheSet =
    (await pressedOf("#swatch-colorFace-5")) === "true" &&
    (await pressedOf("#swatch-colorFace-3")) === "false" &&
    (await exists("#costume-no-changes")) &&
    (await page.evaluate<boolean>(
      `document.querySelector("#costume-reset").disabled && document.querySelector("#costume-review").disabled`,
    ));

  // The Fab here reads the editor again, not my page. A draft made over the set it finds
  // unchanged is kept, and one made over a set that has moved is dropped for the set as read.
  const readEditorAgain = async () => {
    const before = await editorHits();
    await click("#read-again");
    await waitFor(async () => ((await editorHits()) > before ? true : undefined));
    await inStep("editing");
  };
  const myPageReadsBeforeAgain = await myPageHits();
  await readEditorAgain();
  results.readAgainReadsTheEditorHere =
    (await editorHits()) === 2 && (await myPageHits()) === myPageReadsBeforeAgain;
  await click("#swatch-colorFace-3");
  await readEditorAgain();
  results.readAgainKeepsADraftOverAnUnchangedSet =
    (await pressedOf("#swatch-colorFace-3")) === "true" &&
    (await textOf("#costume-changes")) === FACE_CHANGE;
  await fetch(`${HIROBA}/__state?color_body=40`);
  await readEditorAgain();
  await click("#costume-part-colorBody");
  const bodyAsRead = (await pressedOf("#swatch-colorBody-40")) === "true";
  await click("#costume-part-colorFace");
  results.readAgainDropsADraftOverAMovedSet =
    bodyAsRead &&
    (await pressedOf("#swatch-colorFace-5")) === "true" &&
    (await pressedOf("#swatch-colorFace-3")) === "false" &&
    (await exists("#costume-no-changes"));
  await fetch(`${HIROBA}/__state?reset=1`);
  await readEditorAgain();

  // The Save bar is at the window's bottom edge, however much the step has to show, and stays
  // there as the page scrolls.
  const barFlush = () =>
    page.evaluate<boolean>(
      `Math.abs(document.querySelector("#costume-bar").getBoundingClientRect().bottom - window.innerHeight) < 1`,
    );
  const barWhileEditing = await barFlush();
  await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  const barScrolledToTheEnd = await barFlush();
  await page.evaluate("window.scrollTo(0, 0)");
  await click("#swatch-colorFace-3");
  await click("#costume-review");
  await inStep("confirming");
  const barWhileReviewing = await barFlush();
  await click("#costume-back");
  await inStep("editing");
  await click("#costume-reset");
  results.saveBarStaysAtTheBottom = barWhileEditing && barScrolledToTheEnd && barWhileReviewing;

  // The content is a column on a wide window and the whole width on a phone's.
  const pageBox = await boxOf("#costume-page");
  const frameBox = await boxOf("main .MuiContainer-root");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 800,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await waitFor(async () => (await exists("#nav-menu")) || undefined);
  const narrowPageBox = await boxOf("#costume-page");
  const narrowFrameBox = await boxOf("main .MuiContainer-root");
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  await waitFor(async () => (await exists("#nav-overview")) || undefined);
  results.costumePageIsAColumn =
    pageBox.width <= 601 &&
    Math.abs((pageBox.left + pageBox.right) / 2 - (frameBox.left + frameBox.right) / 2) < 2 &&
    Math.abs(narrowPageBox.width - (narrowFrameBox.width - 2 * 16)) < 2;
  await goTo("overview");

  const pageOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-page #write-outcome")?.dataset.outcome ?? null`,
    );
  /**
   * Opens the Costume page on the editor as Hiroba has it now, the draft the set as read. The page
   * reads the editor by itself the first time it is shown in a session, and keeps what it read
   * after that: a change made elsewhere shows after a read again, which is the Fab's.
   */
  const openFreshEditor = async () => {
    await goTo("costume");
    const step = await waitFor(async () => (await stepOf()) ?? undefined);
    if (step !== "unread" && step !== "loading") {
      await readEditorAgain();
    }
    await inStep("editing");
    if (
      await page.evaluate<boolean>(`document.querySelector("#costume-reset")?.disabled === false`)
    ) {
      await click("#costume-reset");
    }
    await onTheColours();
  };
  /** Opens the page on the editor it holds, back from an outcome if one is shown. */
  const openEditing = async () => {
    await goTo("costume");
    const step = await waitFor(async () => {
      const now = await stepOf();
      return now === "editing" || now === "done" ? now : undefined;
    });
    if (step === "done") {
      await click("#costume-back");
    }
    await inStep("editing");
    await onTheColours();
  };
  /** The editor's first tab, Face: where the page starts, and where a visit left on others is not. */
  const onTheColours = async () => {
    await click("#costume-tab-colours");
    await click("#costume-part-colorFace");
  };
  /** Makes a pick on a fresh editor, reviews it, saves, and waits for the outcome. */
  const changeInTheWindow = async (pick: () => Promise<unknown>) => {
    await openFreshEditor();
    await pick();
    await click("#costume-review");
    await waitFor(async () => (await exists("#costume-save")) || undefined);
    await click("#costume-save");
    return waitFor(async () => (await pageOutcome()) ?? undefined);
  };
  const leaveTheCostumePage = () => goTo("overview");
  // A write in the window that leaves the costume as it was asks the picture host for nothing, even
  // with no portrait kept to show: only a change applied, or a read, does. The line stays.
  await fetch(`${HIROBA}/__noop-save`);
  const noChange = await changeInTheWindow(() => click("#swatch-colorFace-3"));
  await leaveTheCostumePage();
  results.myDonNotAskedAfterNoChange =
    noChange === "notApplied" &&
    (await myDonsSettled()) === myDonsFailed &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE &&
    same(await savedCostume(), START);

  // Once the picture host draws it, the next Read again shows the player's My Don beside the plate,
  // the first time ever: once, square on its tile, named for screen readers, and neither its address
  // nor its host in the window. The line under the card now names the score panel's art, asked for
  // once more after each read while it has not come, and still missing.
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
    (await attribute("#my-don-image", "alt")) === "Your My Don, as Hiroba draws it" &&
    tile.width > 0 &&
    Math.abs(tile.width - tile.height) < 1 &&
    !(await exists("#my-don-loading")) &&
    (await textOf("#pictures-code")) ===
      "Code for a report: scorePanel=notPng status=404 type=text/plain;charset=utf-8 bytes=9";
  const withMyDon = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.myDonAddressKeptOutOfDom =
    !withMyDon.includes("mydon_") &&
    !withMyDon.includes("imgsrc") &&
    !withMyDon.includes("img.127.0.0.1") &&
    !withMyDon.includes("000000000000");

  // The user's Read again renews the My Don: fetched anew once it is on screen, once, and kept.
  // The score panel's art comes this time: kept from now on, it is never asked for again.
  await fetch(`${HIROBA}/__panel?answer=png`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Read at");
  await waitForSeen(page, async () => (await myDonsAsked()).length > myDonsAtFirst || undefined);
  const myDonsAfterReadAgain = await myDonsSettled();
  results.myDonAgainOnReadAgain =
    myDonsAfterReadAgain === myDonsAtFirst + 1 &&
    (await attribute("#my-don-image", "src"))?.startsWith("data:image/png;base64,") === true;
  // The art is the mock's, 600×356, and the counts are written over it where my page writes them,
  // the same text as over the stand-in. It was asked for once per read until it came: at the
  // sign-in and after each of the three reads since.
  await waitForSeen(page, async () => (await exists("#score-panel-image")) || undefined);
  const art = await boxOf("#score-panel-image");
  const panelBox = await boxOf("#score-panel");
  results.scorePanelArtShown =
    (await hitsOn(PANEL_ART)) === 4 &&
    (await attribute("#score-panel-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    (await attribute("#score-panel-image", "alt")) === "" &&
    Math.abs(art.width / (art.bottom - art.top) - 600 / 356) < 0.02 &&
    Math.abs(art.width - panelBox.width) < 1 &&
    !(await exists("#score-panel-stand-in")) &&
    !(await exists("#score-panel-loading")) &&
    (await panelCountsInPlace(PANEL_COUNTS)) &&
    !(await exists("#pictures-unavailable"));
  /** How often the art was fetched: kept on disk for every account, it is fetched no more. */
  const panelArtFetches = await hitsOn(PANEL_ART);
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

  // Read again is a small Fab (the user's call, 2026-09-29), at the top right of the page in the
  // band over it, named for screen readers and, under the pointer, in a tooltip. While a read
  // runs, held here by the stand-in, it is shut and spins, and a second press sends nothing; once
  // the read is in, it is open again.
  const fabBox = await boxOf("#read-again");
  const cardBox = await boxOf("#profile");
  await hoverOver(page, "#read-again");
  const fabTooltip = await waitFor(async () => (await textOf('[role="tooltip"]')) ?? undefined);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  results.readAgainIsASmallFab =
    (await attribute("#read-again", "aria-label")) === "Read again" &&
    fabTooltip === "Read again" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#read-again").classList.contains("MuiFab-sizeSmall")`,
    )) &&
    fabBox.bottom <= cardBox.top &&
    Math.abs(fabBox.right - cardBox.right) < 1;
  const fabState = () =>
    page.evaluate<{ shut: boolean; spinning: boolean }>(
      `(() => { const fab = document.querySelector("#read-again"); return { shut: fab.disabled, spinning: fab.querySelector(".MuiCircularProgress-root") !== null }; })()`,
    );
  const readsBeforeHeld = await myPageHits();
  await fetch(`${HIROBA}/__hold-read?on=1`);
  await click("#read-again");
  await waitFor(async () => (await myPageHits()) > readsBeforeHeld || undefined);
  const fabWhileReading = await fabState();
  await click("#read-again");
  await Bun.sleep(300);
  const readsWhileHeld = await myPageHits();
  // Settings, opened while the read runs, says the session is open, not that no one is signed
  // in, and shuts Sign out until the read ends, which would otherwise show the profile after it.
  await goTo("settings");
  const accountWhileReading = await page.evaluate<Record<string, unknown>>(
    `({ who: document.querySelector("#account-who")?.textContent ?? null, signOutShut: document.querySelector("#sign-out")?.disabled ?? null })`,
  );
  await goTo("overview");
  await fetch(`${HIROBA}/__hold-read?on=0`);
  await until("Read at");
  results.readAgainShutWhileReading =
    same(fabWhileReading, { shut: true, spinning: true }) &&
    readsWhileHeld === readsBeforeHeld + 1 &&
    same(await fabState(), { shut: false, spinning: false });
  results.settingsSignedInWhileReading = same(accountWhileReading, {
    who: "Signed in",
    signOutShut: true,
  });

  // On a touch-first screen ((pointer: coarse), touch emulated over CDP), a pull reads again. The
  // Fab is drawn only under the keyboard's focus, and stays for screen readers. From the top of
  // the page, a pull short of the point reads nothing, and one past it, its indicator's ring full,
  // reads once; an upward swipe, a sideways one, or a pull begun lower down the page, nothing.
  type Point = { x: number; y: number };
  /** One finger's swipe, from one point to another in steps, as a touch screen sends one. */
  const swipe = async (from: Point, to: Point, whileDown?: () => Promise<unknown>) => {
    const STEPS = 12;
    await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    for (let step = 1; step <= STEPS; step++) {
      const at = (start: number, end: number) => start + ((end - start) * step) / STEPS;
      await page.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: at(from.x, to.x), y: at(from.y, to.y) }],
      });
    }
    const seen = await whileDown?.();
    await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return seen;
  };
  /** The reads of my page a swipe sent, once any it started is in, and back at the page's top. */
  const readsBySwipe = async (from: Point, to: Point) => {
    const before = await myPageHits();
    await swipe(from, to);
    await Bun.sleep(500);
    await until("Read at");
    await page.evaluate("window.scrollTo(0, 0)");
    return (await myPageHits()) - before;
  };
  const pullIndicator = () =>
    page.evaluate<{ shown: boolean; ring: string | null }>(
      `(() => { const indicator = document.querySelector("#pull-indicator"); return { shown: indicator !== null && getComputedStyle(indicator).opacity === "1", ring: indicator?.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? null }; })()`,
    );
  const fabWidth = async () => (await boxOf("#read-again")).width;
  const touchEmulated = async (enabled: boolean) => {
    await page.send("Emulation.setTouchEmulationEnabled", { enabled, maxTouchPoints: 5 });
    await waitFor(async () => (await fabWidth()) <= 1 === enabled || undefined);
  };
  await touchEmulated(true);
  const fabKeptForScreenReaders = await page.evaluate<boolean>(
    `(() => { const fab = document.querySelector("#read-again"); const style = getComputedStyle(fab); return fab.getAttribute("aria-label") === "Read again" && !fab.closest("[aria-hidden]") && style.display !== "none" && style.visibility !== "hidden"; })()`,
  );
  const SHIFT = { key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16 };
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...SHIFT });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...SHIFT });
  await page.evaluate(`document.querySelector("#read-again").focus()`);
  const fabShownUnderFocus = await waitFor(async () => (await fabWidth()) > 1 || undefined);
  await page.evaluate("document.activeElement.blur()");
  results.fabOnlyUnderFocusOnTouch =
    fabKeptForScreenReaders && fabShownUnderFocus && (await fabWidth()) <= 1;
  const pullFrom = { x: cardBox.left + cardBox.width / 2, y: cardBox.top + 40 };
  const pulledBy = (dx: number, dy: number) => ({ x: pullFrom.x + dx, y: pullFrom.y + dy });
  const readsByShortPull = await readsBySwipe(pullFrom, pulledBy(0, 100));
  const readsBeforePull = await myPageHits();
  const ringAtFullPull = await swipe(pullFrom, pulledBy(0, 200), pullIndicator);
  await Bun.sleep(500);
  await until("Read at");
  results.pullPastThePointReads =
    readsByShortPull === 0 &&
    same(ringAtFullPull, { shown: true, ring: "100" }) &&
    (await myPageHits()) === readsBeforePull + 1 &&
    !(await pullIndicator()).shown;
  const readsByUpwardSwipe = await readsBySwipe(pulledBy(0, 200), pullFrom);
  const readsBySidewaysSwipe = await readsBySwipe(pullFrom, pulledBy(200, 40));
  await page.evaluate("window.scrollTo(0, 200)");
  const readsByPullBelowTop = await readsBySwipe(pullFrom, pulledBy(0, 200));
  results.pullOnlyDownFromTheTop =
    readsByUpwardSwipe === 0 && readsBySidewaysSwipe === 0 && readsByPullBelowTop === 0;
  // A slow pull begun on the portrait opens no tooltip on the way: a finger that moves makes no
  // long press, nor does it take the window to the Costume page. Held past a long press's time and
  // let go short of the point, it reads nothing.
  const onTile = await middleOf(page, "#my-don");
  const readsBeforeSlowPull = await myPageHits();
  const tooltipInSlowPull = await swipe(onTile, { x: onTile.x, y: onTile.y + 100 }, async () => {
    await Bun.sleep(1000);
    return exists('[role="tooltip"]');
  });
  await Bun.sleep(500);
  results.portraitTooltipShutInPull =
    tooltipInSlowPull === false &&
    (await myPageHits()) === readsBeforeSlowPull &&
    (await currentPage()) === "overview";
  await touchEmulated(false);

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
  // The favourites have a page of their own (the user's call, 2026-09-29), from the same read, and
  // read again there too; the Overview shows none of them. Unset so far: no favourite song and an
  // empty folder. Set, the song shows by title and the folder, closed at first, opens on request
  // with every song in it, the two that share a title included.
  const favoritesOffOverview = !(await exists("#favorites"));
  const readsBeforeFavorites = await readHits();
  await goTo("favorites");
  results.favoritesUnsetShown =
    favoritesOffOverview &&
    !(await exists("#profile")) &&
    (await readHits()) === readsBeforeFavorites &&
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
  await goTo("overview");
  // A label that does not read, here the 43-byte GIF Hiroba sends when it has nothing to draw,
  // costs the dan alone: a neutral line and a code, the rest of the page as it was, still no URL.
  await fetch(`${HIROBA}/__variant?dan=14&label=gif`);
  requestsPerRead.push(await readShowing("#dan-unreadable"));
  const afterGif = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.unreadableDanShownWithTheRest =
    (await textOf("#dan-unreadable")) === "Dan-i: couldn't read" &&
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
  // sums to 0. The header's panel writes each 0 as Hiroba does. Every item is still listed, at 0.0%; only those above 0 take a part of a bar, and a
  // block with none shows its empty track, which a block with parts does not.
  await fetch(`${HIROBA}/__variant?panel=zeros`);
  await click("#read-again");
  await waitFor(async () => ((await textOf("#crowns-silver")) === "0 of 0" ? true : undefined));
  const ZERO_RANK_SHARES: readonly Share[] = [
    ["White Iki", "4.0%", 4],
    ["Bronze Iki", "9.1%", 9],
    ["Silver Iki", "18.2%", 18],
    ["Gold Miyabi", "31.3%", 31],
    ["Pink Miyabi", "25.3%", 25],
    ["Purple Miyabi", "12.1%", 12],
    ["Rainbow Kiwami", "0.0%", 0],
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
    (await trackOf("#ranks-bar")) === NO_TRACK &&
    (await textOf("#score-panel-rank-8")) === "0" &&
    same(await allOf("#score-panel [id^='score-panel-crowns-']", "textContent"), ["0", "0", "0"]) &&
    (await textOf("#score-panel-rank-5")) === "31";
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
    (await textOf("#dan")) === "Dan-i: 9th Dan";
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

  // Costume writes. Open in every build, this run's too, with no flag: the Costume page offers the
  // editor, and a write is Review, then Save to Hiroba.
  /** Waits for an undo started from the page to end, and gives its outcome. */
  const undoFrom = async (selector: string) => {
    await click(selector);
    await Bun.sleep(200);
    return waitFor(async () => (await pageOutcome()) ?? undefined);
  };
  /** A write straight through the bridge, as the renderer would ask for one. */
  const bridgeChange = (target: Record<string, number>, expected = START) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeCostume(${JSON.stringify({ expected, target })})`,
    );

  // No "Change costume" button: the portrait is the button to the Costume page (the user's call,
  // 2026-09-29 and 2026-10-02). It is named for that, and a pointer resting on it shows a small
  // edit badge and the name.
  const OPEN_COSTUME = "Open the Costume page";
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  const badgeOpacity = () =>
    page.evaluate<string>(
      `getComputedStyle(document.querySelector("#costume-open-badge")).opacity`,
    );
  const badgeAtRest = await badgeOpacity();
  await hoverOver(page, "#costume-open");
  const badgeOnHover = await waitFor(async () => (await badgeOpacity()) === "1" || undefined);
  const nameOnHover = await waitFor(async () => (await textOf('[role="tooltip"]')) ?? undefined);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  results.portraitIsTheCostumeButton =
    (await page.evaluate<boolean>(
      `(() => { const portrait = document.querySelector("#costume-open"); return portrait?.tagName === "BUTTON" && portrait.querySelector("#my-don") !== null && [...document.querySelectorAll("button")].every((button) => button.textContent.trim() !== ${JSON.stringify(OPEN_COSTUME)}) && !portrait.disabled; })()`,
    )) &&
    (await attribute("#costume-open", "aria-label")) === OPEN_COSTUME &&
    badgeAtRest === "0" &&
    badgeOnHover &&
    nameOnHover === OPEN_COSTUME;

  // The keyboard goes to the Costume page from the portrait, by Enter and by Space, and so it does
  // on the touch-first screen below, where a finger's tap does not.
  const openedBy = async (keys: () => Promise<unknown>) => {
    await page.evaluate(`document.querySelector("#costume-open").focus()`);
    await keys();
    const opened = await waitFor(
      async () => (await currentPage()) === "costume" || undefined,
      5_000,
    );
    await goTo("overview");
    return opened;
  };
  const SPACE = { key: " ", code: "Space", windowsVirtualKeyCode: 32 };
  const openedByKeys = async () =>
    (await openedBy(() => press("Enter"))) &&
    (await openedBy(async () => {
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...SPACE, text: " " });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...SPACE });
    }));
  const openedByKeysWithMouse = await openedByKeys();

  // On a touch-first screen (touch emulated), a finger goes to the Costume page by a long-press on
  // the portrait: its edit badge is up at rest, and a description says to long-press. A tap, which
  // the browser still makes a click of, goes nowhere; nor does a finger held as long but moved on
  // the way, as a pull or a scroll begun on the portrait is, and that reads nothing either. The
  // lift after a long-press makes no click on the page it went to.
  // Neither the keyboard's focus nor the pointer on the portrait, which put its badge up too.
  await page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  const longPressHint = await waitFor(() =>
    page.evaluate<string | undefined>(
      `document.getElementById(document.querySelector("#costume-open").getAttribute("aria-describedby") ?? "")?.textContent`,
    ),
  );
  await waitFor(async () => (await badgeOpacity()) === "1" || undefined, 5_000);
  results.portraitJumpsToCostumeByKeyboard = openedByKeysWithMouse && (await openedByKeys());
  await page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
  await page.evaluate(
    `window.touchClicks = []; document.addEventListener("click", (event) => window.touchClicks.push(event.pointerType), true)`,
  );
  const touchClicks = () => page.evaluate<string[]>("window.touchClicks");
  const onPortrait = await middleOf(page, "#costume-open");
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [onPortrait] });
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const tapClicked = await waitFor(
    async () => (await touchClicks()).includes("touch") || undefined,
  );
  await Bun.sleep(2 * LONG_PRESS_MS);
  const wentByTap = (await currentPage()) === "costume";
  const readsBeforeMovedPress = await myPageHits();
  await swipe(onPortrait, { x: onPortrait.x, y: onPortrait.y + 100 }, () =>
    Bun.sleep(2 * LONG_PRESS_MS),
  );
  await Bun.sleep(500);
  const wentByMovedPress =
    (await currentPage()) === "costume" || (await myPageHits()) !== readsBeforeMovedPress;
  const clicksBeforeLongPress = await touchClicks();
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [onPortrait] });
  const wentByLongPress = await waitFor(
    async () => (await currentPage()) === "costume" || undefined,
    5_000,
  );
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await Bun.sleep(500);
  results.portraitJumpsToCostumeByLongPress =
    longPressHint === "Long-press your My Don to open the Costume page." &&
    tapClicked &&
    !wentByTap &&
    !wentByMovedPress &&
    wentByLongPress &&
    same(await touchClicks(), clicksBeforeLongPress) &&
    (await currentPage()) === "costume" &&
    (await stepOf()) === "done";
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: false });

  // The editor's picture of the set, which the mock draws from the query and for a session only:
  // a picture shown means the session went with the request. One request when the page is first
  // shown (above), by the site's names in the site's order, then one per pause in the picks; in
  // the window, a data: URL. The page is open now, by the long-press, on the outcome of the write
  // that moved nothing, which is where it was left.
  await inStep("done");
  await click("#costume-back");
  await inStep("editing");
  const onOpen = await previewOtherThan(null);
  results.columnStillAcrossPages =
    overviewScrolls &&
    sameColumn(columnOnOverview, columnOnSettings) &&
    sameColumn(columnOnSettings, await column());
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#swatch-colorFace-4");
  const afterColour = await previewOtherThan(onOpen);
  await Bun.sleep(500);
  results.previewChangesAfterColour =
    afterColour.startsWith("data:image/png;base64,") &&
    same(await previewQueries(), [previewQuery({ ...START, colorFace: 4 })]);
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
  // Away from the page, nothing more is asked.
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#swatch-colorFace-21");
  await leaveTheCostumePage();
  await Bun.sleep(800);
  results.previewNoneOnceShut = same(await previewQueries(), []);

  // The items' thumbnails, which the mock draws for a session only: a picture shown means the
  // session went with the request. With forty more items in the きぐるみ slot than its box shows,
  // only the rows on screen and one ahead are asked for, each once, from the editor, and only for
  // items the editor offered; shown again, the page asks for none of them.
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
  /** Opens the page on its items tab, on an editor read afresh if `fresh`, else the one it holds. */
  const openItems = async (fresh = false) => {
    await (fresh ? openFreshEditor() : openEditing());
    await click("#costume-tab-items");
    await waitFor(async () => (await exists("#costume-items-costume1")) || undefined);
  };
  await fetch(`${HIROBA}/__thumbs?reset=1`);
  const owned = (await (await fetch(`${HIROBA}/__items?many=1`)).json()) as Record<
    string,
    number[]
  >;
  const ownedIn = (slot: number) => owned[String(slot)] ?? [];
  await openItems(true);
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
  // On a touch screen, a finger on the grid once it has scrolled is the grid's to scroll back, and
  // pulls nothing; on it at its top, a pull from the top of the page reads the editor again, and
  // not my page.
  await touchEmulated(true);
  await page.evaluate("window.scrollTo(0, 0)");
  const gridBox = await boxOf("#costume-items-costume1");
  const fromGrid = { x: (gridBox.left + gridBox.right) / 2, y: gridBox.top + 10 };
  const pulledOnGrid = { x: fromGrid.x, y: fromGrid.y + 160 };
  await page.evaluate(`document.querySelector("#costume-items-costume1").scrollTop = 100`);
  const gridScrolled =
    (await page.evaluate<number>(`document.querySelector("#costume-items-costume1").scrollTop`)) >
    0;
  const editorReadsBeforeGridPull = await editorHits();
  await swipe(fromGrid, pulledOnGrid);
  await Bun.sleep(500);
  results.pullLeavesAScrolledGridAlone =
    gridScrolled &&
    (await editorHits()) === editorReadsBeforeGridPull &&
    (await stepOf()) === "editing" &&
    !(await pullIndicator()).shown;
  await page.evaluate(`document.querySelector("#costume-items-costume1").scrollTop = 0`);
  const myPageReadsBeforeGridPull = await myPageHits();
  await swipe(fromGrid, pulledOnGrid);
  await waitFor(async () => ((await editorHits()) > editorReadsBeforeGridPull ? true : undefined));
  await inStep("editing");
  results.pullReadsTheEditorOnTheCostumePage =
    (await editorHits()) === editorReadsBeforeGridPull + 1 &&
    (await myPageHits()) === myPageReadsBeforeGridPull;
  await touchEmulated(false);
  // The editor's tabs, Remove and an item's label are the game's terms in the page's language, so
  // they carry no mark of their own.
  const editorTerms = await page.evaluate<(string | null)[][]>(
    `["#costume-tab-items", "#costume-part-costume1", "#item-costume1-0", "#item-costume1-4"].map((selector) => { const node = document.querySelector(selector); return [node?.lang ?? null, node?.getAttribute("aria-label") ?? node?.textContent ?? null]; })`,
  );
  results.editorTermsLeftUnmarked = same(
    editorTerms.map(([lang]) => lang),
    ["", "", "", ""],
  );
  results.editorTermsInEnglish = same(
    editorTerms.map(([, label]) => label),
    ["Costume", "Mascot", "Remove", "Mascot #4"],
  );
  const withThumbnails = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.thumbnailAddressesKeptOutOfDom =
    !withThumbnails.includes("imgsrc") &&
    !withThumbnails.includes("cos=") &&
    !withThumbnails.includes("_token_v2") &&
    !tokens.some((token) => withThumbnails.includes(token));
  // The touch scrolling above shows rows beyond the first view for as long as its finger takes,
  // and a slow finger leaves a cell in view long enough to be asked for, once, like any other. What
  // this counts from is therefore the thumbnails asked for by the time the page is left.
  const askedBeforeReopen = (await thumbsSettled()).length;
  await leaveTheCostumePage();
  await openItems();
  await waitFor(async () => (await exists("#item-costume1-4 img")) || undefined);
  await Bun.sleep(1500);
  results.thumbnailsAskedOncePerRun = (await thumbs()).length === askedBeforeReopen;
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
  const slotTwoAsked = thumbsAfterGif.slice(askedBeforeReopen);
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
  await leaveTheCostumePage();
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
  await leaveTheCostumePage();
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
  // The costume changed: the My Don on the Overview is fetched anew, once, as the Overview is
  // shown again, and shows the new one.
  await goTo("overview");
  await waitForSeen(
    page,
    async () => (await myDonsAsked()).length > myDonsBeforeColour || undefined,
  );
  const myDonsAfterColour = await myDonsSettled();
  const myDonAfterColour = await attribute("#my-don-image", "src");
  // The change's undo is on the Costume page, where the outcome shows, and nowhere else: not on
  // the Overview or Favourites, and no Snackbar over any page.
  const undoElsewhere = async () =>
    (await exists("#costume-undo")) ||
    (await exists("#write-outcome")) ||
    (await exists(".MuiSnackbar-root"));
  const undoOnOverview = await undoElsewhere();
  await goTo("favorites");
  await Bun.sleep(1000);
  const undoOnFavorites = await undoElsewhere();
  await goTo("costume");
  await inStep("done");
  results.undoOnTheCostumePageAlone =
    (await exists("#costume-undo")) &&
    (await textOf("#undo-when")) !== null &&
    (await pageOutcome()) === "applied" &&
    !undoOnOverview &&
    !undoOnFavorites &&
    !(await exists(".MuiSnackbar-root"));

  // Undone from the page: the whole set back, by a write like any other. Pressed twice, as a
  // double-click would: the second press finds it gone and sends nothing.
  await resetLog();
  await click("#costume-undo");
  const secondPressShut = await page.evaluate<boolean>(
    `(() => { const undo = document.querySelector("#costume-undo"); if (undo === null) return true; const shut = undo.disabled; undo.click(); return shut; })()`,
  );
  await Bun.sleep(200);
  results.colourUndoneFromThePage =
    (await waitFor(async () => (await pageOutcome()) ?? undefined)) === "applied" &&
    (await textOf("#costume-page #write-outcome")) ===
      "Undone. Hiroba shows the costume as it was." &&
    same(await savedCostume(), START) &&
    sameBesideLanePictures(await requestLog(), WRITE_REQUESTS);
  results.undoOncePerPress = secondPressShut;
  // So does the undo: once more, and the My Don is back as it was.
  await goTo("overview");
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

  // A きぐるみ: the page warns, the four pieces come off, and one undo puts all eight back.
  let noteGoneBeforeNextChange = false;
  const kigurumiOutcome = await changeInTheWindow(async () => {
    // The page no longer says the costume is as it was before the colour: that undo is behind it.
    noteGoneBeforeNextChange = !(await exists("#write-outcome"));
    await click("#costume-tab-items");
    await waitFor(async () => (await exists("#item-costume1-36")) || undefined);
    await click("#item-costume1-36");
    await waitFor(async () => (await exists("#kigurumi-warning")) || undefined);
  });
  results.undoneNoteClearedByNextChange = noteGoneBeforeNextChange;
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
  const savesBeforeUndo = await hitsOn("/ajax/change_mydon.php");
  results.kigurumiUndoneInOnePost =
    (await undoFrom("#costume-undo")) === "applied" &&
    same(await savedCostume(), START) &&
    (await hitsOn("/ajax/change_mydon.php")) - savesBeforeUndo === 1 &&
    !(await exists("#costume-undo"));
  // The My Don fetched anew after that change and its undo is in before the log is read below.
  await goTo("overview");
  await myDonsSettled();

  // #22: a piece beside a きぐるみ, which Hiroba would answer 0 to and ignore, is refused unsent: the
  // trap costs the editor's read, and no post.
  await resetLog();
  const trap = await bridgeChange({ ...START, costume1: 36 });
  results.trapRefusedUnsent =
    same(trap, { kind: "invalidTarget", field: "costume1" }) &&
    sameBesideLanePictures(await requestLog(), ["GET /mypage_kisekae.php"]);

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

  // Nor does a read start inside a write: while an undo waits on its pre-check, the Fab is shut,
  // and neither a press on it nor a pull from the top of the page asks Hiroba anything. The log is
  // the undo's alone. The read that shows the undo on offer is the Costume page's, of the editor.
  const toUndo = await bridgeChange({ ...START, colorLimb: 20 });
  await openFreshEditor();
  await waitFor(async () => (await exists("#costume-undo")) || undefined);
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeUndo = await hitsOn("/ajax/check_ip_kisekae.php");
  await click("#costume-undo");
  await waitFor(
    async () => (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeUndo || undefined,
  );
  const fabShutInWrite = (await fabState()).shut;
  // The pages can be changed meanwhile, and the window is signed in still: Settings shuts Sign out
  // until the write ends, and the page finds the undo still running on return.
  await goTo("settings");
  const signOutShutInWrite = await page.evaluate<boolean>(
    `document.querySelector("#sign-out")?.disabled === true`,
  );
  const signedInInWrite = (await textOf("#account-who")) === "Signed in";
  await goTo("costume");
  const undoingOnReturn = (await stepOf()) === "undoing";
  await click("#read-again");
  await touchEmulated(true);
  await swipe(pullFrom, pulledBy(0, 200));
  await touchEmulated(false);
  await Bun.sleep(300);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  results.signOutShutWhileAWriteRuns = signOutShutInWrite && signedInInWrite && undoingOnReturn;
  results.noReadInsideAWrite =
    toUndo.kind === "applied" &&
    fabShutInWrite &&
    (await waitFor(async () => (await pageOutcome()) ?? undefined)) === "applied" &&
    sentAsPlanned(await requestLog(), [], WRITE_REQUESTS) &&
    same(await savedCostume(), START);

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

  // A post answered with a redirect is followed with one GET that has no body, as a browser does,
  // and never sent again: a 302 or 303 ends at my page, which is no answer to a pre-check, and a
  // 307 or 308, which would repeat the post, comes back as it is. The write stops before its save.
  const savesBeforeRedirects = await hitsOn("/ajax/change_mydon.php");
  const redirectRuns: {
    status: number;
    stopped: { kind: string; reason?: unknown };
    log: string[];
  }[] = [];
  for (const status of [302, 303, 307, 308]) {
    await fetch(`${HIROBA}/__post-redirect?status=${status}`);
    await resetLog();
    const stopped = await bridgeChange({ ...START, colorLimb: 20 });
    redirectRuns.push({ status, stopped, log: await requestLog() });
  }
  await fetch(`${HIROBA}/__post-redirect`);
  const THEN_MY_PAGE = [
    "GET /mypage_kisekae.php",
    "POST /ajax/check_ip_kisekae.php",
    "GET /mypage_top.php",
  ];
  results.postRedirectFollowedAsABrowserDoes =
    redirectRuns.every(
      ({ stopped }) =>
        stopped.kind === "stoppedBeforeWrite" && stopped.reason === "precheckUnexpected",
    ) &&
    redirectRuns.every(({ status, log }) =>
      sameBesideLanePictures(log, status < 307 ? THEN_MY_PAGE : THEN_MY_PAGE.slice(0, 2)),
    ) &&
    (await hitsOn("/ajax/change_mydon.php")) === savesBeforeRedirects;

  // Changed elsewhere after a change: its undo stops unsent, says why, and is withdrawn.
  const changedElsewhere = await bridgeChange({ ...START, colorLimb: 20 });
  await readEditorAgain();
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
  // Name & title (the user's call, 2026-10-02): one page, after the Costume page, for the title and
  // the Donder name. Both are open in every build, this run's too, with no flag: the list of titles
  // is read when the page is first shown, never before, and a write is Review, then Save to Hiroba.
  const TITLE_PAGE = "/mypage_title_edit.php";
  /**
   * A title write's requests: the costume read on both sides (the desktop has made no title write
   * for real yet), the title page, the pre-check, the save, and my page read back for the title.
   */
  const TITLE_REQUESTS = [
    "GET /mypage_kisekae.php",
    "GET /mypage_title_edit.php",
    "POST /ajax/check_ip_title.php",
    "POST /ajax/change_mydon_profile.php",
    "GET /mypage_top.php",
    "GET /mypage_kisekae.php",
  ];
  /**
   * A rename's: my page read on both sides for the title, my page for the form, the save, and my
   * page read back for the name. It has no pre-check.
   */
  const NAME_REQUESTS = [
    "GET /mypage_top.php",
    "GET /mypage_top.php",
    "POST /ajax/change_mydon_profile.php",
    "GET /mypage_top.php",
    "GET /mypage_top.php",
  ];
  /** After a title write the window reads my page again, and the dan label it shows. */
  const REREAD = ["GET /mypage_top.php", `GET ${DAN_LABEL}`];
  const isPicture = (line: string) => line === PREVIEW || LANE_PICTURES.includes(line);
  /** Whether `log` is a write's `run` with no picture inside it, and then `after`, pictures aside. */
  const runThen = (log: string[], run: string[], after: string[]) => {
    const kept = log.filter((line) => !isPicture(line));
    const endOfRun = log.findIndex(
      (_, index) =>
        log.slice(0, index + 1).filter((line) => !isPicture(line)).length === run.length,
    );
    return (
      same(kept, [...run, ...after]) &&
      endOfRun !== -1 &&
      sentAsPlanned(log.slice(0, endOfRun + 1), [], run)
    );
  };
  /** The requests so far, once `count` that are no pictures are in and a moment has passed. */
  const requestsSettled = async (count: number) => {
    await waitFor(async () =>
      (await requestLog()).filter((line) => !isPicture(line)).length >= count ? true : undefined,
    );
    await Bun.sleep(400);
    return requestLog();
  };
  const titleOf = (id: number) => {
    const found = OWNED_TITLES.find((one) => one.id === id);
    if (found === undefined) {
      throw new Error(`The mock owns no title ${id}`);
    }
    return found;
  };
  const UNLISTED_TITLE = "部品から作った称号";
  const profileNow = async () =>
    (await (await fetch(`${HIROBA}/__profile`)).json()) as { title: string; nickname: string };
  const profileAsStarted = { title: INITIAL_PROFILE.title, nickname: INITIAL_PROFILE.nickname };
  const profilePosts = async () =>
    (await (await fetch(`${HIROBA}/__profile-posts`)).json()) as PostRecord[];
  const profileSaves = async () =>
    (await profilePosts()).filter((post) => post.path === "/ajax/change_mydon_profile.php");
  const AJAX_HEADERS = (referer: string) => (post: PostRecord) =>
    post.xRequestedWith === "XMLHttpRequest" &&
    post.origin === HIROBA &&
    post.referer === `${HIROBA}${referer}` &&
    post.contentType === "application/x-www-form-urlencoded; charset=UTF-8";
  type Section = "title" | "name";
  const stepIn = (section: Section) =>
    page.evaluate<string | null>(
      `document.querySelector("#${section}-section")?.dataset.step ?? null`,
    );
  const inSection = (section: Section, step: string) =>
    waitFor(async () => ((await stepIn(section)) === step ? true : undefined));
  const outcomeOf = (section: Section) =>
    page.evaluate<string | null>(
      `document.querySelector("#${section}-outcome")?.dataset.outcome ?? null`,
    );
  const outcomeShown = (section: Section) =>
    waitFor(async () => (await outcomeOf(section)) ?? undefined);
  const disabledOf = (selector: string) =>
    page.evaluate<boolean | null>(
      `document.querySelector(${JSON.stringify(selector)})?.disabled ?? null`,
    );
  const inputValueOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.value ?? null`,
    );
  /** Reads again from the Fab, which on this page reads my page and then the list of titles. */
  const readTitlesAgain = async () => {
    const before = await hitsOn(TITLE_PAGE);
    await click("#read-again");
    await waitFor(async () => ((await hitsOn(TITLE_PAGE)) > before ? true : undefined));
    await inSection("title", "idle");
  };
  const ARROW_DOWN = { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 };
  const popupOpened = async () => {
    await page.evaluate(`document.querySelector("#title-pick").focus()`);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...ARROW_DOWN });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...ARROW_DOWN });
    await waitFor(async () => (await exists('[role="listbox"]')) || undefined);
  };
  const popupClosed = async () => {
    await press("Escape");
    await waitFor(async () => ((await exists('[role="listbox"]')) ? undefined : true));
  };
  type Listed = {
    id: string | undefined;
    name: string;
    lang: string;
    numbered: boolean;
    current: boolean;
  };
  const listed = () =>
    page.evaluate<Listed[]>(
      `[...document.querySelectorAll('[role="listbox"] [data-title-id]')].map((li) => ({ id: li.dataset.titleId, name: li.querySelector("span")?.textContent ?? "", lang: li.querySelector("span")?.lang ?? "", numbered: /#[0-9]+/.test(li.textContent), current: li.textContent.includes("Current") }))`,
    );
  /** Picks a title by typing part of its name and choosing its option. */
  const pickTitle = async (typed: string, id: number) => {
    await page.evaluate(`document.querySelector("#title-pick").focus()`);
    await page.send("Input.insertText", { text: typed });
    await waitFor(async () => (await exists(`[data-title-id="${id}"]`)) || undefined);
    await page.evaluate(`document.querySelector('[data-title-id="${id}"]').click()`);
    await waitFor(async () => ((await disabledOf("#title-review")) === false ? true : undefined));
  };
  /** Reviews the title picked, and sends it. The outcome is waited for by the caller. */
  const saveTitlePicked = async () => {
    await click("#title-review");
    await inSection("title", "confirming");
    await click("#title-save");
  };
  /**
   * Waits out the read of my page that follows a title write the title moved by: it unmounts the page
   * and shows it again, with the outcome, once the profile is in.
   */
  const rereadDone = async (readsBefore: number) => {
    await waitFor(async () => ((await myPageHits()) >= readsBefore + 2 ? true : undefined));
    await waitFor(async () =>
      (await exists("#title-section")) ? ((await outcomeOf("title")) ?? undefined) : undefined,
    );
    await Bun.sleep(300);
  };
  /**
   * Picks, reviews and saves a title from the page and gives how it ended. A write that moved the
   * title is followed by a read of my page, which is waited out; one that did not (`rereads` false)
   * is not.
   */
  const changeTitleInTheWindow = async (typed: string, id: number, rereads = true) => {
    const readsBefore = await myPageHits();
    await pickTitle(typed, id);
    await saveTitlePicked();
    const outcome = await outcomeShown("title");
    if (rereads) {
      await rereadDone(readsBefore);
    }
    return outcome;
  };
  /** Writes into the name field as a keyboard or a paste would, past the field's own length limit. */
  const typeName = (name: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector("#name-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(name)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const saveNameTyped = async (name: string) => {
    await typeName(name);
    await waitFor(async () => ((await disabledOf("#name-review")) === false ? true : undefined));
    await click("#name-review");
    await inSection("name", "confirming");
    await click("#name-save");
  };
  const changeNameInTheWindow = async (name: string) => {
    await saveNameTyped(name);
    return outcomeShown("name");
  };
  /** Presses a section's undo, and gives the outcome it ends with. */
  const undoSection = async (section: Section) => {
    const readsBefore = await myPageHits();
    await click(`#${section}-undo`);
    await Bun.sleep(200);
    const outcome = await waitFor(async () =>
      (await stepIn(section)) === "done" ? ((await outcomeOf(section)) ?? undefined) : undefined,
    );
    if (section === "title" && outcome === "applied") {
      await rereadDone(readsBefore);
    }
    return outcome;
  };
  const backToIdle = async (section: Section) => {
    await click(`#${section}-back`);
    await inSection(section, "idle");
  };
  /** A title write straight through the bridge, as the renderer would ask for one. */
  const bridgeTitle = (
    target = { id: 102, title: titleOf(102).label },
    expected = { title: INITIAL_PROFILE.title },
  ) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeTitle(${JSON.stringify({ expected, target })})`,
    );
  const bridgeName = (target: string, expected = INITIAL_PROFILE.nickname) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeName(${JSON.stringify({ expected: { nickname: expected }, target: { nickname: target } })})`,
    );
  const pendingUndoKinds = () =>
    page
      .evaluate<{ kind: string }[]>("window.abth.pendingUndo()")
      .then((all) => all.map((one) => one.kind));

  // The list is read when the page is first shown, and not before: not at start-up, not by any
  // other page, signed out or in. Once, whatever the page shows.
  await goTo("overview");
  const titleReadsBeforeThePage = await hitsOn(TITLE_PAGE);
  await goTo("nameTitle");
  await inSection("title", "idle");
  await inSection("name", "idle");
  await popupOpened();
  const options = await listed();
  results.titleListShown =
    titleReadsBeforeThePage === 0 &&
    (await hitsOn(TITLE_PAGE)) === 1 &&
    same(
      options.map((one) => [one.id, one.name]),
      OWNED_TITLES.map((one) => [String(one.id), one.label]),
    ) &&
    options.every((one) => one.lang === "ja") &&
    same(
      options.filter((one) => one.numbered).map((one) => one.id),
      ["104", "105"],
    ) &&
    (await textOf("#title-count")) === "Titles to choose from: 8";
  results.titleWornMarked =
    same(
      options.filter((one) => one.current).map((one) => one.id),
      ["101"],
    ) &&
    !(await exists("#title-shared")) &&
    !(await exists("#title-not-listed"));
  await popupClosed();
  results.titleAndNameWordsMarkedJapanese = await page.evaluate<boolean>(
    `(() => { const lang = (selector) => document.querySelector(selector)?.lang; return ["#title-current", "#title-pick", "#name-input", "#name-site-warning"].every((selector) => lang(selector) === "ja"); })()`,
  );

  // Titles that share a name are listed once each, however the list is searched, and no option's id
  // repeats on the page: a search for the shared name lists both titles, a search for another lists
  // that one alone, and clearing the search lists them all again.
  const searchedFor = async (text: string) => {
    await page.evaluate(
      `(() => { const input = document.querySelector("#title-pick"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
    await Bun.sleep(300);
    return page.evaluate<{ titles: (string | undefined)[]; ids: string[] }>(
      `(() => { const options = [...document.querySelectorAll('[role="listbox"] [role="option"]')]; return { titles: options.map((option) => option.dataset.titleId), ids: options.map((option) => option.id) }; })()`,
    );
  };
  await popupOpened();
  const searchedShared = await searchedFor("同じ名前");
  const searchedCleared = await searchedFor("");
  const searchedOther = await searchedFor("最後");
  await searchedFor("");
  await popupClosed();
  results.titlePickerListsEachTitleOnce =
    same(searchedShared.titles, ["104", "105"]) &&
    same(
      searchedCleared.titles,
      OWNED_TITLES.map((one) => String(one.id)),
    ) &&
    same(searchedOther.titles, ["108"]) &&
    [searchedShared, searchedCleared, searchedOther].every(
      (found) => new Set(found.ids).size === found.ids.length,
    );

  // Its buttons are named in the app's words: the one that opens the list, the same while it is
  // open, and the one that clears a title picked (which MUI draws only once one is).
  const pickerButton = (kind: "popupIndicator" | "clearIndicator") =>
    page.evaluate<string | null>(
      `document.querySelector(".MuiAutocomplete-${kind}")?.getAttribute("aria-label") ?? null`,
    );
  const labelWhenClosed = await pickerButton("popupIndicator");
  await popupOpened();
  const labelWhenOpen = await pickerButton("popupIndicator");
  await pickTitle("最後", 108);
  const labelOfClear = await pickerButton("clearIndicator");
  await searchedFor("");
  await popupClosed();
  results.titlePickerButtonsNamedInTheCatalog = same(
    [labelWhenClosed, labelWhenOpen, labelOfClear],
    [en.t("title.open"), en.t("title.close"), en.t("title.clear")],
  );

  // A name two titles share cannot tell which is worn: every option of it is marked and the note
  // says why. A name no title of the list has may be a title built from parts, and the note says so.
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(titleOf(104).label)}`);
  await readTitlesAgain();
  await popupOpened();
  const sharedMarks = (await listed()).filter((one) => one.current).map((one) => one.id);
  await popupClosed();
  const sharedNote = await textOf("#title-shared");
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(UNLISTED_TITLE)}`);
  await readTitlesAgain();
  await popupOpened();
  const unlistedMarks = (await listed()).filter((one) => one.current).length;
  await popupClosed();
  results.titleSharedNameNamed =
    same(sharedMarks, ["104", "105"]) &&
    sharedNote === "2 of your titles have this name, so the app cannot tell which one you wear." &&
    (await textOf("#title-not-listed")) ===
      "Your current title is not in this list. It may be built from parts, which this version cannot read or change back." &&
    unlistedMarks === 0 &&
    !(await exists("#title-shared"));
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

  // A title: Review lists the change, Save sends exactly the planned requests, then my page is read
  // again for the plate. The posts are the page's own, with the pre-check bare of a token.
  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  const readsBeforeTitle = await myPageHits();
  await pickTitle("最後", 108);
  await click("#title-review");
  await inSection("title", "confirming");
  const titleReview = await textOf("#title-changes");
  await click("#title-save");
  const titleOutcome = await outcomeShown("title");
  await rereadDone(readsBeforeTitle);
  const titleLog = await requestsSettled(TITLE_REQUESTS.length + REREAD.length);
  const titleAfter = await profileNow();
  await waitFor(async () =>
    (await textOf("#profile-title")) === `Title: ${titleOf(108).label}` ? true : undefined,
  );
  results.titleApplied =
    titleOutcome === "applied" &&
    titleReview === `Title: ${INITIAL_PROFILE.title} → ${titleOf(108).label}` &&
    (await textOf("#title-outcome")) === "Saved. Hiroba now shows the new title." &&
    (await textOf("#profile-title")) === `Title: ${titleOf(108).label}`;
  results.titleSentOnlyThePlannedRequests = runThen(titleLog, TITLE_REQUESTS, REREAD);
  const titlePosts = await profilePosts();
  results.titlePostsCarryTheAjaxShape =
    same(
      titlePosts.map((post) => post.path),
      ["/ajax/check_ip_title.php", "/ajax/change_mydon_profile.php"],
    ) &&
    titlePosts.every(AJAX_HEADERS("/mypage_title_edit.php")) &&
    same(titlePosts[0]?.fields, ["mode", "newTitle"]) &&
    titlePosts[0]?.ticketMatched === false &&
    same(titlePosts[1]?.fields, ["newTitle", "_tckt", "mode", "getStatus"]) &&
    titlePosts[1]?.ticketMatched === true &&
    same(
      titlePosts.map((post) => post.values.newTitle),
      ["108", "108"],
    );
  results.titleMovedOneField =
    same(titleAfter, { title: titleOf(108).label, nickname: INITIAL_PROFILE.nickname }) &&
    same(await savedCostume(), START);

  // Its undo writes the old name back, by a write like any other: the whole run again, one save.
  const titleUndoNote = await textOf("#title-undo-note");
  const titleUndoOffered = (await disabledOf("#title-undo")) === false;
  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  const titleUndoOutcome = await undoSection("title");
  const titleUndoLog = await requestsSettled(TITLE_REQUESTS.length + REREAD.length);
  results.titleUndone =
    titleUndoOutcome === "applied" &&
    titleUndoNote === `Goes back to: ${INITIAL_PROFILE.title}` &&
    titleUndoOffered &&
    (await textOf("#title-outcome")) === "Undone. Hiroba shows the title as it was." &&
    same(await profileNow(), profileAsStarted) &&
    runThen(titleUndoLog, TITLE_REQUESTS, REREAD) &&
    (await profileSaves()).length === 1 &&
    !(await exists("#title-undo"));
  await backToIdle("title");

  // Hiroba's code for a title it will not take comes with no message: the page says what it means.
  await fetch(`${HIROBA}/__profile-next-result?code=5&message=`);
  const titleRefused = await changeTitleInTheWindow("別の", 102, false);
  const titleRefusedText = (await textOf("#title-outcome")) ?? "";
  results.titleRefusedShowsCode =
    titleRefused === "notApplied" &&
    titleRefusedText.includes("Hiroba refused the change (code 5). Nothing changed.") &&
    titleRefusedText.includes("Hiroba says you do not own that title.") &&
    same(await profileNow(), profileAsStarted) &&
    !(await exists("#title-undo"));
  await backToIdle("title");

  // A pre-check that asks for a confirmation stops the write before its save.
  const savesBeforeTitlePrechecks = await hitsOn("/ajax/change_mydon_profile.php");
  const titleStops: string[] = [];
  for (const answer of ["true", "1", "string1", "0", "html"]) {
    await fetch(`${HIROBA}/__title-precheck?answer=${answer}`);
    titleStops.push((await bridgeTitle()).kind);
  }
  await fetch(`${HIROBA}/__title-precheck?answer=false`);
  results.titlePrecheckStopsTheSave =
    same(titleStops, [
      "needsConfirmation",
      "needsConfirmation",
      "needsConfirmation",
      "stoppedBeforeWrite",
      "stoppedBeforeWrite",
    ]) &&
    (await hitsOn("/ajax/change_mydon_profile.php")) === savesBeforeTitlePrechecks &&
    same(await profileNow(), profileAsStarted);

  // A save that answers 0 and moves nothing reads as not applied, whatever it said; a stale token
  // reads as stale; and the costume moving while a title is written is a write that diverged.
  await fetch(`${HIROBA}/__profile-noop-save`);
  const titleNoop = await bridgeTitle();
  results.titleNoopSaveNotApplied =
    titleNoop.kind === "notApplied" &&
    same(titleNoop.reason, { kind: "unchanged" }) &&
    same(await profileNow(), profileAsStarted);
  await fetch(`${HIROBA}/__profile-next-result?code=705&message=`);
  const titleStale = await bridgeTitle();
  results.titleStaleSaysStale =
    titleStale.kind === "notApplied" &&
    same(titleStale.reason, { kind: "stale" }) &&
    same(await profileNow(), profileAsStarted);
  await fetch(`${HIROBA}/__title-hold-precheck?on=1`);
  const titlePrechecksBefore = await hitsOn("/ajax/check_ip_title.php");
  const titleWhileCostumeMoves = bridgeTitle();
  await waitFor(async () =>
    (await hitsOn("/ajax/check_ip_title.php")) > titlePrechecksBefore ? true : undefined,
  );
  await fetch(`${HIROBA}/__state?color_face=9`);
  await fetch(`${HIROBA}/__title-hold-precheck?on=0`);
  const titleDiverged = await titleWhileCostumeMoves;
  results.titleCostumeMovedIsDiverged =
    titleDiverged.kind === "diverged" && titleDiverged.cross === "changed";
  await fetch(`${HIROBA}/__state?reset=1`);
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

  // An undo to a name several titles share, or to one no title has, is shut with the reason in
  // words, and asked for anyway it is refused unsent, the record kept.
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(titleOf(104).label)}`);
  await readTitlesAgain();
  const ambiguousOutcome = await changeTitleInTheWindow("サンプルの", 101);
  const savesBeforeAmbiguous = await hitsOn("/ajax/change_mydon_profile.php");
  const ambiguousRefusal = await page.evaluate<{ kind: string; field?: string }>(
    `window.abth.undo("title")`,
  );
  results.titleUndoAmbiguousExplained =
    ambiguousOutcome === "applied" &&
    (await disabledOf("#title-undo")) === true &&
    (await textOf("#title-undo-reason")) ===
      "This undo is not available: your previous title shares its name with other titles. Pick it from the list yourself." &&
    (await textOf("#title-undo-note")) === `Goes back to: ${titleOf(104).label}` &&
    same(ambiguousRefusal, { kind: "invalidTarget", field: "title.ambiguous" }) &&
    (await hitsOn("/ajax/change_mydon_profile.php")) === savesBeforeAmbiguous &&
    (await pendingUndoKinds()).includes("title");
  await backToIdle("title");
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(UNLISTED_TITLE)}`);
  await readTitlesAgain();
  const unlistedOutcome = await changeTitleInTheWindow("サンプルの", 101);
  const savesBeforeUnlisted = await hitsOn("/ajax/change_mydon_profile.php");
  const unlistedRefusal = await page.evaluate<{ kind: string; field?: string }>(
    `window.abth.undo("title")`,
  );
  results.titleUndoUnlistedExplained =
    unlistedOutcome === "applied" &&
    (await disabledOf("#title-undo")) === true &&
    (await textOf("#title-undo-reason")) ===
      "This undo is not available: your previous title is not in today's list, so the app cannot set it again." &&
    same(unlistedRefusal, { kind: "invalidTarget", field: "title.unresolved" }) &&
    (await hitsOn("/ajax/change_mydon_profile.php")) === savesBeforeUnlisted &&
    (await pendingUndoKinds()).includes("title");
  await backToIdle("title");
  // The title is moved elsewhere, and the next read of my page dates that undo as gone by.
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(titleOf(102).label)}`);
  await readTitlesAgain();
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

  // The Name section. The field holds the name worn, up to the form's ten, and counts it; nothing is
  // sent for what is no change or what the form would not take, or while the page says renames are
  // closed.
  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  results.nameFieldPrefilled =
    (await inputValueOf("#name-input")) === INITIAL_PROFILE.nickname &&
    (await disabledOf("#name-review")) === true &&
    (await disabledOf("#name-input")) === false &&
    sameBesideLanePictures(await requestLog(), []);
  await typeName("あたらしい");
  results.nameMaxLengthAndCounter =
    (await attribute("#name-input", "maxlength")) === "10" &&
    (await textOf("#name-counter")) === "5 / 10" &&
    (await disabledOf("#name-review")) === false;
  await typeName(` ${INITIAL_PROFILE.nickname} `);
  const sameNameHelp = await textOf("#name-input-helper-text");
  const sameNameShut = await disabledOf("#name-review");
  const unsendable = `あ${String.fromCharCode(1)}い`;
  const invalidNames: [string, string | null][] = [
    ["", null],
    [
      "あ".repeat(11),
      "This app refused the change before sending it: the name is longer than Hiroba's form takes.",
    ],
    [
      unsendable,
      "This app refused the change before sending it: the name has a character that cannot be sent.",
    ],
  ];
  const invalidShown: [boolean | null, string | null][] = [];
  for (const [name] of invalidNames) {
    await typeName(name);
    invalidShown.push([await disabledOf("#name-review"), await textOf("#name-input-helper-text")]);
  }
  const sentBeforeTheBridge = await requestLog();
  const edgeRefused = await bridgeName(" あ");
  results.nameUnchangedSendsNothing =
    sameNameHelp === "That is your name already." &&
    sameNameShut === true &&
    sameBesideLanePictures(sentBeforeTheBridge, []);
  results.nameInvalidRefusedUnsent =
    same(
      invalidShown,
      invalidNames.map(([, help]) => [true, help]),
    ) &&
    same(edgeRefused, { kind: "invalidTarget", field: "name.edge" }) &&
    sameBesideLanePictures(await requestLog(), ["GET /mypage_top.php", "GET /mypage_top.php"]) &&
    (await profileSaves()).length === 0;
  await typeName(INITIAL_PROFILE.nickname);

  // The page can say renames are closed: the field is shut and says why, and a flag it cannot read
  // leaves the field open with a note.
  await fetch(`${HIROBA}/__rename?state=closed`);
  await readTitlesAgain();
  const closedNote = await textOf("#name-closed");
  const closedShut = [await disabledOf("#name-input"), await disabledOf("#name-review")];
  await fetch(`${HIROBA}/__rename?state=odd`);
  await readTitlesAgain();
  const unknownNote = await textOf("#name-unknown");
  const unknownOpen = await disabledOf("#name-input");
  await fetch(`${HIROBA}/__rename?state=open`);
  await readTitlesAgain();
  results.nameClosedShowsWhy =
    closedNote ===
      "Hiroba says names can't be changed right now: 今はドンだーネームは変更できないドン！" &&
    same(closedShut, [true, true]) &&
    unknownNote ===
      "This version couldn't tell whether Hiroba is taking name changes right now. You can still try." &&
    unknownOpen === false &&
    !(await exists("#name-closed")) &&
    !(await exists("#name-unknown")) &&
    (await profileSaves()).length === 0;

  // A name: Review lists the change and says Hiroba may not let it be changed back; Save sends the
  // planned requests, with no pre-check and no read of my page after, since the page's name is the
  // one read back. The post is the dialog's own.
  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  await typeName("あたらしい");
  await click("#name-review");
  await inSection("name", "confirming");
  const nameReview = await textOf("#name-changes");
  const mayNotRevert = await textOf("#name-may-not-revert");
  await click("#name-save");
  const nameOutcome = await outcomeShown("name");
  const nameLog = await requestsSettled(NAME_REQUESTS.length);
  const nameAfter = await profileNow();
  results.nameApplied =
    nameOutcome === "applied" &&
    nameReview === `Name: ${INITIAL_PROFILE.nickname} → あたらしい` &&
    mayNotRevert ===
      "Hiroba may not let you change it back right away. Choose a name you are happy to keep." &&
    (await textOf("#name-outcome")) === "Saved. Hiroba now shows the new name." &&
    same(nameAfter, { title: INITIAL_PROFILE.title, nickname: "あたらしい" }) &&
    (await textOf("#title-plate h2")) === "あたらしい";
  results.nameSentOnlyThePlannedRequests = sentAsPlanned(nameLog, [], NAME_REQUESTS);
  const namePosts = await profilePosts();
  results.namePostCarriesTheFormOrder =
    same(
      namePosts.map((post) => post.path),
      ["/ajax/change_mydon_profile.php"],
    ) &&
    namePosts.every(AJAX_HEADERS("/mypage_top.php")) &&
    same(namePosts[0]?.fields, ["_tckt", "mode", "oldName", "newName"]) &&
    same(namePosts[0]?.values, {
      mode: "name",
      oldName: INITIAL_PROFILE.nickname,
      newName: "あたらしい",
    }) &&
    namePosts[0]?.ticketMatched === true;

  // Its undo puts the old name back, one save, by a write like any other. Hiroba may refuse it:
  // the cooldown here does, in its own words, and the undo stays offered after.
  const nameUndoNote = await textOf("#name-undo-note");
  const nameUndoWarning = await textOf("#name-undo-warning");
  await resetLog();
  const nameUndoOutcome = await undoSection("name");
  const nameUndoLog = await requestsSettled(NAME_REQUESTS.length);
  results.nameUndone =
    nameUndoOutcome === "applied" &&
    nameUndoNote === `Goes back to: ${INITIAL_PROFILE.nickname}` &&
    nameUndoWarning === "Hiroba may refuse this too. If it does, the name stays as it is." &&
    (await textOf("#name-outcome")) === "Undone. Hiroba shows the name as it was." &&
    same(await profileNow(), profileAsStarted) &&
    sentAsPlanned(nameUndoLog, [], NAME_REQUESTS) &&
    !(await exists("#name-undo"));
  await backToIdle("name");
  await changeNameInTheWindow("あたらしい");
  await backToIdle("name");
  await fetch(`${HIROBA}/__rename-cooldown?on=1`);
  const refusedUndo = await undoSection("name");
  const refusedUndoText = (await textOf("#name-outcome")) ?? "";
  const nameKeptAfterRefusedUndo = (await profileNow()).nickname === "あたらしい";
  await backToIdle("name");
  results.nameUndoRefusedKeepsTheRecord =
    refusedUndo === "notApplied" &&
    refusedUndoText.includes("Hiroba refused the change (code 1). Nothing changed.") &&
    refusedUndoText.includes(`Hiroba said: ${COOLDOWN_MESSAGE}`) &&
    nameKeptAfterRefusedUndo &&
    (await exists("#name-undo"));
  await fetch(`${HIROBA}/__rename-cooldown?on=0`);
  const undoneAtLast = await undoSection("name");
  await backToIdle("name");
  results.nameUndoneOnceHirobaTakesIt =
    undoneAtLast === "applied" && same(await profileNow(), profileAsStarted);

  // A name the filter refuses comes back in Hiroba's words, shown as the text they are: nothing in
  // them is markup. The section stays open, and the field keeps what was typed.
  const filtered = await changeNameInTheWindow(REFUSED_NAME);
  const filteredText = (await textOf("#name-outcome")) ?? "";
  await backToIdle("name");
  const fieldAfterRefusal = await inputValueOf("#name-input");
  await fetch(
    `${HIROBA}/__profile-next-result?code=1&message=${encodeURIComponent("<b>不適切</b>な名前")}`,
  );
  const markedUp = await changeNameInTheWindow("あたらしい");
  const markedUpText = (await textOf("#name-outcome")) ?? "";
  const markupInOutcome = await exists("#name-outcome b");
  await backToIdle("name");
  results.nameRefusedShowsHirobaWordsAsText =
    filtered === "notApplied" &&
    filteredText.includes(`Hiroba said: ${FILTER_MESSAGE}`) &&
    fieldAfterRefusal === REFUSED_NAME &&
    markedUp === "notApplied" &&
    markedUpText.includes("Hiroba said: <b>不適切</b>な名前") &&
    !markupInOutcome &&
    same(await profileNow(), profileAsStarted);
  await typeName(INITIAL_PROFILE.nickname);

  // Nor does a read start inside a title or a name write, nor a second write: while a rename waits
  // on its save, the Fab is shut, the other section is, a title write asked for through the bridge
  // answers busy, and so does the undo, with nothing sent for any of them.
  await fetch(`${HIROBA}/__profile-hold-save?on=1`);
  const savesBeforeHeldName = await hitsOn("/ajax/change_mydon_profile.php");
  await saveNameTyped("あたらしい");
  await waitFor(async () =>
    (await hitsOn("/ajax/change_mydon_profile.php")) > savesBeforeHeldName ? true : undefined,
  );
  await resetLog();
  const fabShutInNameWrite = (await fabState()).shut;
  const titleShutInNameWrite = [await disabledOf("#title-pick"), await disabledOf("#title-review")];
  const busyTitle = await bridgeTitle();
  const busyUndo = await page.evaluate<{ kind: string }>(`window.abth.undo("name")`);
  await click("#read-again");
  await Bun.sleep(300);
  const requestsWhileHeld = await requestLog();
  await fetch(`${HIROBA}/__profile-hold-save?on=0`);
  const heldNameOutcome = await outcomeShown("name");
  results.noReadInsideAWriteHeldAtASave =
    fabShutInNameWrite &&
    same(titleShutInNameWrite, [true, true]) &&
    same(busyTitle, { kind: "busy" }) &&
    same(busyUndo, { kind: "busy" }) &&
    sameBesideLanePictures(requestsWhileHeld, []) &&
    heldNameOutcome === "applied";
  await undoSection("name");
  await backToIdle("name");
  await fetch(`${HIROBA}/__title-hold-precheck?on=1`);
  const prechecksBeforeHeldTitle = await hitsOn("/ajax/check_ip_title.php");
  const readsBeforeHeldTitle = await myPageHits();
  await pickTitle("別の", 102);
  await saveTitlePicked();
  await waitFor(async () =>
    (await hitsOn("/ajax/check_ip_title.php")) > prechecksBeforeHeldTitle ? true : undefined,
  );
  await resetLog();
  const fabShutInTitleWrite = (await fabState()).shut;
  const nameShutInTitleWrite = [await disabledOf("#name-input"), await disabledOf("#name-review")];
  const busyName = await bridgeName("あたらしい");
  const busyTitleUndo = await page.evaluate<{ kind: string }>(`window.abth.undo("title")`);
  await click("#read-again");
  await Bun.sleep(300);
  const requestsWhileTitleHeld = await requestLog();
  await fetch(`${HIROBA}/__title-hold-precheck?on=0`);
  const heldTitleOutcome = await outcomeShown("title");
  await rereadDone(readsBeforeHeldTitle);
  results.noReadInsideAWriteHeldAtAPrecheck =
    fabShutInTitleWrite &&
    same(nameShutInTitleWrite, [true, true]) &&
    same(busyName, { kind: "busy" }) &&
    same(busyTitleUndo, { kind: "busy" }) &&
    sameBesideLanePictures(requestsWhileTitleHeld, []) &&
    heldTitleOutcome === "applied";
  await undoSection("title");
  await backToIdle("title");

  // The session ends after a title's save: it is dropped, whether the title was saved is not known,
  // and the next read of my page settles the undo from the title it shows.
  await goTo("overview");
  await fetch(`${HIROBA}/__profile-expire-on-save`);
  const afterTitleSave = await bridgeTitle();
  const titleDropped =
    afterTitleSave.kind === "sessionGone" &&
    afterTitleSave.writeMayHaveHappened === true &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));
  await click("#read-again");
  await until("You are not signed in.");
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  results.sessionGoneAfterTitleSaveSettlesOnNextRead =
    titleDropped &&
    same(await page.evaluate("window.abth.pendingUndo()"), [
      {
        kind: "title",
        at: new Date(NOON_JST).toISOString(),
        before: { title: INITIAL_PROFILE.title },
        after: { title: titleOf(102).label },
      },
    ]);
  // Back where it started, read once more so the undo above is dated as gone by, and none is on offer.
  await fetch(`${HIROBA}/__profile?reset=1`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Read at");
  results.titleAndNameLeaveNoUndoOffered = same(
    await page.evaluate("window.abth.pendingUndo()"),
    [],
  );
  await resetLog();

  // No form token the mock handed out reaches the window.
  const handedOut = (await (await fetch(`${HIROBA}/__tickets`)).json()) as string[];
  const windowNow = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.formTokensKeptOutOfDom =
    handedOut.length > 0 && !handedOut.some((ticket) => windowNow.includes(ticket));

  // The session ends while the change is being reviewed: nothing is posted, and it is back to
  // signing in.
  await openFreshEditor();
  const postsBeforeExpiry = await hitsOn("/ajax/check_ip_kisekae.php");
  await click("#swatch-colorFace-9");
  await click("#costume-review");
  await waitFor(async () => (await exists("#costume-save")) || undefined);
  await fetch(`${HIROBA}/__expire`);
  await Bun.sleep(100);
  await click("#costume-save");
  await until("Hiroba ended the session before anything was saved");
  results.sessionGoneBeforeSaveSendsNothing =
    (await hitsOn("/ajax/check_ip_kisekae.php")) === postsBeforeExpiry &&
    (await exists("#sign-in")) &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));

  // The session ends after the save: the session is dropped, whether it saved is unknown, and
  // the next editor read settles the undo from what the costume is. Signed in again on the
  // Overview, which reads the editor not at all: the page that does is not the one shown.
  await goTo("overview");
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
  // The Costume page's picture of the set goes with them: the page's first frame, once the next
  // session's editor is read, draws none of the last session's picture.
  await page.evaluate(
    `(() => { window.costumeFirstFrame = null; const observer = new MutationObserver(() => { if (document.querySelector("#costume-preview") === null) return; window.costumeFirstFrame = document.querySelector("#costume-preview-image") !== null; observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); })()`,
  );
  await goTo("costume");
  await inStep("editing");
  await previewOtherThan(null);
  results.signInForgetsTheCostumePreview =
    (await page.evaluate("window.costumeFirstFrame")) === false;
  await goTo("overview");
  const kept = (await (await fetch(`${HIROBA}/__last-token`)).text()).trim();
  tokens.push(kept);
  // Kept on disk for the next launch: the user chose staying signed in over a memory-only session.
  results.sessionKept =
    existsSync(SESSION_FILE) && readFileSync(SESSION_FILE, "utf8").includes(kept);

  // Reopened, the app is still signed in and reads once, by itself, and not the editor: that is
  // read when the Costume page is shown. The undo kept on disk is offered there. Its clock is in
  // Hiroba's daily break, and a write then sends nothing at all.
  const readsBeforeReopen = await myPageHits();
  const editorReadsBeforeReopen = await editorHits();
  const platesBeforeReopen = (await platesSettled()).length;
  const myDonsBeforeReopen = await myDonsSettled();
  const medalPlatesBeforeReopen = await medalPlatesSettled();
  const thumbsBeforeReopen = (await thumbsSettled()).length;
  await stop(running);
  running = await launch({ now: IN_THE_BREAK });
  await running.until("サンプルどん");
  results.signedInAfterReopen = true;
  results.readsOnReopen = (await myPageHits()) - readsBeforeReopen;
  await Bun.sleep(1000);
  results.editorNotReadOnReopen = (await editorHits()) === editorReadsBeforeReopen;
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
  // So does the score panel's art, kept on disk for every account.
  const panelArtShownOn = (app: typeof running) =>
    waitForSeen(
      app.page,
      async () =>
        (await app.page.evaluate<boolean>(
          `document.querySelector("#score-panel-image") !== null`,
        )) || undefined,
    );
  await panelArtShownOn(running);
  results.scorePanelOncePerDevice = (await hitsOn(PANEL_ART)) === panelArtFetches;
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
  const titleInTheBreak = await running.page.evaluate(
    `window.abth.changeTitle(${JSON.stringify({ expected: { title: INITIAL_PROFILE.title }, target: { id: 102, title: OWNED_TITLES[1]?.label } })})`,
  );
  const nameInTheBreak = await running.page.evaluate(
    `window.abth.changeName(${JSON.stringify({ expected: { nickname: INITIAL_PROFILE.nickname }, target: { nickname: "あたらしい" } })})`,
  );
  results.titleAndNameBreakSendNothing =
    same(titleInTheBreak, { kind: "maintenance" }) &&
    same(nameInTheBreak, { kind: "maintenance" }) &&
    same(await requestLog(), []);
  // The Costume page, shown for the first time in this launch, reads the editor then, once, and
  // offers the undo kept on disk. Its items show the thumbnails kept on disk, and ask Hiroba for
  // none: the きぐるみ slot's, seen on the first launch, and the second slot's, which came on
  // reopening it there.
  const shownOnReopen = (selector: string) =>
    running.page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await running.goTo("costume");
  results.undoOfferedAfterReopen = await waitFor(
    async () => (await shownOnReopen("#costume-undo")) || undefined,
  );
  results.editorReadOnceOnReopen = (await editorHits()) === editorReadsBeforeReopen + 1;
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
  await running.goTo("overview");

  /**
   * Signs out in Settings, which offers it while signed in, and whether the window then shows the
   * Overview, with its sign-in card.
   */
  const signOut = async () => {
    await running.goTo("settings");
    const offered = (await running.textOf("#sign-out")) === "Sign out";
    await running.click("#sign-out");
    await running.until("Sign in to Hiroba");
    return offered && (await running.currentPage()) === "overview";
  };
  results.signOutHandled = (await signOut()) && !existsSync(SESSION_FILE);

  // Reopened after signing out, it stays signed out and asks Hiroba nothing. A write asked for
  // anyway while it is signed out sends nothing.
  const readsBeforeSecondReopen = await myPageHits();
  await stop(running);
  running = await launch({ now: NOON_JST });
  await running.until("Sign in to Hiroba");
  await Bun.sleep(500);
  results.signedOutAfterReopen = (await myPageHits()) === readsBeforeSecondReopen;
  await resetLog();
  const signedOutWrites = await running.page.evaluate(
    `Promise.all([window.abth.pendingUndo(), window.abth.changeCostume(${JSON.stringify({ expected: START, target: { ...START, colorFace: 3 } })}), window.abth.undo("costume")])`,
  );
  results.signedOutWritesSendNothing =
    same(signedOutWrites, [[], { kind: "notSignedIn" }, { kind: "notSignedIn" }]) &&
    same(await requestLog(), []);
  // Signed in on this launch, which no flag opened, the portrait goes to the Costume page, which
  // reads the editor and offers Review: writes are open in every build. A write asked for through
  // the bridge reaches Hiroba's editor, finds the costume as it is, and posts nothing. Signed out
  // again after, so the session is not left for the scan below.
  const platesSignedOut = (await platesAsked()).length;
  const myDonsSignedOut = (await myDonsAsked()).length;
  const medalPlatesSignedOut = await hitsOn(MEDAL_PLATE);
  const thumbsSignedOut = (await thumbs()).length;
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  const editorReadsBeforeOpening = await editorHits();
  await running.click("#costume-open");
  await waitFor(async () => (await running.currentPage()) === "costume" || undefined);
  await waitFor(
    async () =>
      (await running.page.evaluate<string | null>(
        `document.querySelector("#costume-page")?.getAttribute("data-step") ?? null`,
      )) === "editing" || undefined,
  );
  results.writesOpenOnAFlaglessLaunch =
    (await running.textOf("main h1")) === "Costume" &&
    (await editorHits()) === editorReadsBeforeOpening + 1 &&
    (await running.page.evaluate<boolean>(
      `["#costume-tab-colours", "#costume-review", "#costume-bar"].every((selector) => document.querySelector(selector) !== null)`,
    ));
  await resetLog();
  const leftAsIs = { ...START, colorFace: 7 };
  const nothingToChange = await running.page.evaluate(
    `window.abth.changeCostume(${JSON.stringify({ expected: leftAsIs, target: leftAsIs })})`,
  );
  results.writeSentWithNoFlag =
    same(nothingToChange, { kind: "nothingToChange" }) &&
    sentAsPlanned(await requestLog(), [], ["GET /mypage_kisekae.php"]);
  await running.goTo("overview");
  // Signed out on the last launch and in again on this one, the plate and the thumbnails kept on
  // disk are still there, and Hiroba is asked for none of them (the user's call, 2026-09-28: no
  // picture is deleted at sign-out). A thumbnail is asked for through the bridge, after the
  // editor's read that offers it.
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
  await panelArtShownOn(running);
  results.scorePanelSurvivesSignOut = (await hitsOn(PANEL_ART)) === panelArtFetches;
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
    await signOut();
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
  await signOut();
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

  // Every read waits out every kind of write, and so does the first read of an editor. A write is
  // held mid-way by the stand-in (a costume and a title at their pre-checks, a rename at its save),
  // and the four reads that PORT_QUEUEING names are asked through the bridge meanwhile: none sends
  // anything until the write has read back, and they go after it in the order asked.
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  await Bun.sleep(1500);
  const READS_ASKED: Record<VerbsQueued<"read">, { call: string; requests: string[] }> = {
    readProfile: {
      call: "window.abth.readProfile().then((result) => result.ok)",
      requests: ["GET /mypage_top.php", `GET ${DAN_LABEL}`],
    },
    openCostumeEditor: {
      call: "window.abth.openCostumeEditor().then((result) => result.ok)",
      requests: ["GET /mypage_kisekae.php"],
    },
    openTitleEditor: {
      call: "window.abth.openTitleEditor().then((result) => result.ok)",
      requests: [`GET ${TITLE_PAGE}`],
    },
    previewCostume: {
      call: `window.abth.previewCostume(${JSON.stringify(START)}).then((result) => result.ok)`,
      requests: [PREVIEW],
    },
  };
  const readsAsked = Object.values(READS_ASKED);
  const HELD_WRITES = [
    {
      hold: "/__hold-precheck",
      reset: "/__state?reset=1",
      heldAt: "/ajax/check_ip_kisekae.php",
      run: WRITE_REQUESTS,
      call: `window.abth.changeCostume(${JSON.stringify({ expected: START, target: { ...START, colorLimb: 20 } })})`,
    },
    {
      hold: "/__title-hold-precheck",
      reset: "/__profile?reset=1",
      heldAt: "/ajax/check_ip_title.php",
      run: TITLE_REQUESTS,
      call: `window.abth.changeTitle(${JSON.stringify({ expected: { title: INITIAL_PROFILE.title }, target: { id: 102, title: titleOf(102).label } })})`,
    },
    {
      hold: "/__profile-hold-save",
      reset: "/__profile?reset=1",
      heldAt: "/ajax/change_mydon_profile.php",
      run: NAME_REQUESTS,
      call: `window.abth.changeName(${JSON.stringify({ expected: { nickname: INITIAL_PROFILE.nickname }, target: { nickname: "あたらしい" } })})`,
    },
  ];
  const waitedOut: boolean[] = [];
  for (const held of HELD_WRITES) {
    await fetch(`${HIROBA}${held.reset}`);
    await resetLog();
    await fetch(`${HIROBA}${held.hold}?on=1`);
    const heldBefore = await hitsOn(held.heldAt);
    const writing = running.page.evaluate<{ kind: string }>(held.call);
    await waitFor(async () => (await hitsOn(held.heldAt)) > heldBefore || undefined);
    const reading = readsAsked.map((read) => running.page.evaluate<boolean>(read.call));
    await Bun.sleep(300);
    const whileHeld = await requestLog();
    await fetch(`${HIROBA}${held.hold}?on=0`);
    const ended = await writing;
    const answered = await Promise.all(reading);
    const afterwards = await requestLog();
    const upToTheHold = held.run.slice(0, held.run.indexOf(`POST ${held.heldAt}`) + 1);
    waitedOut.push(
      sameBesideLanePictures(whileHeld, upToTheHold) &&
        ended.kind === "applied" &&
        answered.every(Boolean) &&
        sameBesideLanePictures(afterwards, [
          ...held.run,
          ...readsAsked.flatMap((read) => read.requests),
        ]),
    );
  }
  results.everyReadWaitsOutEveryWrite =
    waitedOut.length === HELD_WRITES.length && waitedOut.every(Boolean);
  await fetch(`${HIROBA}/__state?reset=1`);
  await fetch(`${HIROBA}/__profile?reset=1`);

  // The first read of an editor waits too, as a picture does, whichever write is running: the Name
  // & title page shown for the first time while a costume write is held reads nothing, and its
  // section stays unread, until the write has ended; then it reads once.
  const stepOn = (selector: string) =>
    running.page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.dataset.step ?? null`,
    );
  const stepIs = (selector: string, step: string) =>
    waitFor(async () => ((await stepOn(selector)) === step ? true : undefined));
  const present = (selector: string) =>
    running.page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await running.goTo("costume");
  await stepIs("#costume-page", "editing");
  await running.click("#swatch-colorFace-3");
  await running.click("#costume-review");
  await waitFor(async () => ((await present("#costume-save")) ? true : undefined));
  await Bun.sleep(600);
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeFirstRead = await hitsOn("/ajax/check_ip_kisekae.php");
  const titleReadsBeforeFirstRead = await hitsOn(TITLE_PAGE);
  await running.click("#costume-save");
  await waitFor(
    async () =>
      (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeFirstRead || undefined,
  );
  await running.goTo("nameTitle");
  await Bun.sleep(400);
  const titleStepWhileHeld = await stepOn("#title-section");
  const titleReadsWhileHeld = await hitsOn(TITLE_PAGE);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  await stepIs("#title-section", "idle");
  results.firstTitleReadWaitsOutACostumeWrite =
    titleStepWhileHeld === "unread" &&
    titleReadsWhileHeld === titleReadsBeforeFirstRead &&
    runThen(await requestsSettled(WRITE_REQUESTS.length + 1), WRITE_REQUESTS, [
      `GET ${TITLE_PAGE}`,
    ]);
  await fetch(`${HIROBA}/__state?reset=1`);

  // And the Costume page shown for the first time while a rename is held, in a session whose editors
  // are unread again after a sign-out.
  await signOut();
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  await running.goTo("nameTitle");
  await stepIs("#name-section", "idle");
  await running.page.evaluate(
    `(() => { const input = document.querySelector("#name-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "あたらしい"); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
  );
  await waitFor(async () =>
    (await running.page.evaluate<boolean>(
      `document.querySelector("#name-review").disabled === false`,
    ))
      ? true
      : undefined,
  );
  await running.click("#name-review");
  await stepIs("#name-section", "confirming");
  await resetLog();
  await fetch(`${HIROBA}/__profile-hold-save?on=1`);
  const savesBeforeFirstRead = await hitsOn("/ajax/change_mydon_profile.php");
  const editorReadsBeforeFirstRead = await hitsOn("/mypage_kisekae.php");
  await running.click("#name-save");
  await waitFor(
    async () =>
      (await hitsOn("/ajax/change_mydon_profile.php")) > savesBeforeFirstRead || undefined,
  );
  await running.goTo("costume");
  await Bun.sleep(400);
  const editorStepWhileHeld = await stepOn("#costume-page");
  const editorReadsWhileHeld = await hitsOn("/mypage_kisekae.php");
  await fetch(`${HIROBA}/__profile-hold-save?on=0`);
  await stepIs("#costume-page", "editing");
  results.firstEditorReadWaitsOutARename =
    editorStepWhileHeld === "unread" &&
    editorReadsWhileHeld === editorReadsBeforeFirstRead &&
    runThen(await requestsSettled(NAME_REQUESTS.length + 1), NAME_REQUESTS, [
      "GET /mypage_kisekae.php",
    ]);
  await fetch(`${HIROBA}/__profile?reset=1`);
  await signOut();
  tokens.push(...((await (await fetch(`${HIROBA}/__tickets`)).json()) as string[]));
} finally {
  await stop(running);
  mock.kill();
}

/**
 * Starts the app on the stand-in and attaches to its window over the DevTools protocol. Nothing
 * opens writes: there is no flag, and the one that once did is taken out of the environment, so
 * every check below runs with none. `now` fixes the clock a write checks Hiroba's daily break
 * against. Every run keeps what it reads in the debug folder, so the scan below covers it.
 *
 * A window other windows cover counts as hidden on Windows, and a hidden page sees nothing, so it
 * asks for no picture: the switch keeps the window seen however it is covered. `--lang` gives the
 * app its system language: English unless a check asks for another, since the checks read its
 * English words. `userData` is where the app keeps what it keeps.
 */
async function launch({
  now,
  lang = "en-US",
  userData = USER_DATA,
}: {
  now: string;
  lang?: string;
  userData?: string;
}) {
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    "--disable-backgrounding-occluded-windows",
    `--lang=${lang}`,
  ];
  const { ABTH_UNVERIFIED_WRITES: _gone, ...inherited } = process.env;
  const proc = Bun.spawn([String(electronPath), root, ...args], {
    env: {
      ...inherited,
      ABTH_DEV_HIROBA_ORIGIN: HIROBA,
      ABTH_DEV_IDP_HOST: IDP_HOST,
      ABTH_DEV_IMG_ORIGIN: IMG,
      ABTH_DEV_USER_DATA: userData,
      ABTH_DEV_NOW: now,
      ABTH_DEBUG_SAVE_READS: "1",
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
  /** The page the side panel marks as shown, or null when no panel is drawn. */
  const currentPage = () =>
    page.evaluate<string | null>(
      `document.querySelector('[aria-current="page"]')?.id.replace("nav-", "") ?? null`,
    );
  /** Opens a page from the side panel, which a window this wide draws, and waits until it shows. */
  const goTo = async (to: "overview" | "costume" | "nameTitle" | "favorites" | "settings") => {
    await click(`#nav-${to}`);
    await waitFor(async () => (await currentPage()) === to || undefined);
  };
  return { proc, page, text, textOf, click, clickButton, until, currentPage, goTo };
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
const savedTitleEditor = join(USER_DATA, "debug", "mypage_title_edit.php.html");
results.titleDebugReadRedacted =
  existsSync(savedTitleEditor) && readFileSync(savedTitleEditor, "utf8").includes(`value="<tckt>"`);
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

/** Rests the mouse on the middle of `selector`, as a pointer over it would. */
async function hoverOver(
  page: Awaited<ReturnType<typeof connect>>,
  selector: string,
): Promise<void> {
  const middle = await middleOf(page, selector);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...middle });
}

/** The middle of `selector` in the window, where a pointer or a finger rests on it. */
function middleOf(
  page: Awaited<ReturnType<typeof connect>>,
  selector: string,
): Promise<{ x: number; y: number }> {
  return page.evaluate<{ x: number; y: number }>(
    `(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
  );
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
