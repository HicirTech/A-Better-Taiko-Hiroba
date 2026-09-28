/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again, a rotated session,
 * every どんメダル state, a dan-less, title-less, region-less my page, a set favourite song and a
 * filled favourites folder, the identity card on Hiroba's title plate (its text over it, one plate
 * per title, one that does not come, the plate kept across a sign-out), the editor's picture of the
 * set (on opening, after a pick, one request for a burst of picks, one that does not come, none
 * once shut, none inside a write), its items' thumbnails (only those seen, each once a run, one
 * that does not come, one not offered, shapes the bridge refuses, none inside a write), costume
 * writes (a colour and a きぐるみ, each undone, the #22 trap, a save that moves nothing,
 * pre-checks that stop, a post sent to the login page, an undo after a change made elsewhere, and
 * a session that ends before and after a save), a lost session, cancel, a sign-in sent off both
 * sites, a reopen that keeps the session and the undo, Hiroba's daily break, sign-out, and a
 * reopen that stays signed out with the write gate shut and, signed in, shows the editor's button
 * shut and why, against scripts/mock-hiroba.ts, over the Chrome DevTools
 * Protocol. It counts the reads the mock saw and checks each write sent exactly the requests
 * planned, then searches the app's user-data folder for every session token and form token the
 * mock issued and for what the mock ID host left behind. Run `bun run build` first.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";

import { BRIDGE_CHANNELS } from "../src/session-port";
import { COSTUME_FIELDS, type CostumeState, INITIAL_COSTUME } from "./mock-costume";

const root = join(import.meta.dir, "..");
const HIROBA = "http://hiroba.127.0.0.1.sslip.io:8807";
const CDP_PORT = 9333;
const IDP_HOST = "id.127.0.0.1.sslip.io:8808";
const IDP_MARKER = "abth-mock-idp-marker";
const MY_PAGE = "/mypage_top.php";
const DAN_LABEL = "/imgsrc_danlabel.php";
const USER_DATA = join(root, "out", "e2e-user-data");
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
/**
 * The pictures the window's lane asks for by itself, as they come on screen: the items' thumbnails
 * and, after each read of my page, the title plate.
 */
const LANE_PICTURES: readonly string[] = [THUMBNAIL, TITLE_PLATE];
/** Every request the mock saw since the last reset, as "METHOD /path", in the order they came. */
const requestLog = async () => (await (await fetch(`${HIROBA}/__log`)).json()) as string[];
/**
 * Whether `log` is the requests `before`, then a write's `run` with nothing inside it, and the
 * pictures (of the set, of its items, and the title plate) anywhere else. The pictures go as the
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
 * asked for again, and answered from the run's memory, or fetched when its title is new.
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

let running = await launch({ writes: true, now: NOON_JST });
try {
  const { page, text, textOf, click, clickButton, until } = running;
  await until("Sign in to Hiroba");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );
  // The window gets the port's verbs, each with its channel, and nothing else.
  results.bridgeIsThePortVerbs = same(
    (results.surface as { bridge: string[] }).bridge,
    Object.keys(BRIDGE_CHANNELS),
  );

  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  results.profileShown = (await textOf("#crowns-silver")) === "11 of 14";
  // The panel drawn as GitHub's "Languages" box (the user's call, 2026-09-28), from the mock's fixed
  // counts: ranks 8 down to 2 at 3, 12, 25, 31, 18, 9 and 4, and crowns 11, 2 and 1. Each legend
  // item is a name, its share of its block and, for screen readers, its count; each part of a bar
  // names its count in its title. The ranks best first, the crowns silver, gold and donderful.
  type Share = readonly [name: string, percent: string, count: number];
  const RANK_SHARES: readonly Share[] = [
    ["虹極", "2.9%", 3],
    ["紫雅", "11.8%", 12],
    ["桃雅", "24.5%", 25],
    ["金雅", "30.4%", 31],
    ["銀粋", "17.6%", 18],
    ["銅粋", "8.8%", 9],
    ["白粋", "3.9%", 4],
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
    (await textOf("#pictures-unavailable")) === null;
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

  // Read again: one more request, no more.
  await click("#read-again");
  await until("Read at");
  await Bun.sleep(300);
  results.readsAfterReadAgain = await myPageHits();

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
  // from the run's memory, asking Hiroba nothing.
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
  results.medalCountShown = (await textOf("#medal-count")) === "Medals: 12";
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
  // again, the run's memory answers, and Hiroba is asked for nothing more.
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

  // Costume writes. This run opened the gate (unpackaged, ABTH_UNVERIFIED_WRITES=1), so the card
  // offers the editor, and every write is unverified: a tick to confirm, and the title read twice.
  const exists = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  const dialogOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-dialog #write-outcome")?.dataset.outcome ?? null`,
    );
  const cardOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#profile #write-outcome")?.dataset.outcome ?? null`,
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

  await click("#sign-in");
  await until("サンプルどん");
  const kept = (await (await fetch(`${HIROBA}/__last-token`)).text()).trim();
  tokens.push(kept);
  // Kept on disk for the next launch: the user chose staying signed in over a memory-only session.
  results.sessionKept =
    existsSync(SESSION_FILE) && readFileSync(SESSION_FILE, "utf8").includes(kept);

  // Reopened, the app is still signed in and reads once, by itself. The undo kept on disk is still
  // offered. Its clock is in Hiroba's daily break, and a write then sends nothing at all.
  const readsBeforeReopen = await myPageHits();
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
  // The read asks for the title plate too, which this run's memory does not hold yet: once it has
  // come, nothing more is on its way.
  await waitForSeen(
    running.page,
    async () =>
      (await running.page.evaluate<boolean>(
        `document.querySelector("#title-plate-image") !== null`,
      )) || undefined,
  );
  await resetLog();
  const inTheBreak = await running.page.evaluate(
    `window.abth.changeCostume(${JSON.stringify({ expected: { ...START, colorFace: 7 }, target: START })})`,
  );
  results.breakSendsNothing =
    same(inTheBreak, { kind: "maintenance" }) && same(await requestLog(), []);

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
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  results.shutGateSaysWhy =
    (await running.page.evaluate<boolean>(
      `document.querySelector("#costume-open")?.disabled === true`,
    )) &&
    (await running.textOf("#costume-not-open")) ===
      "Not open in this build yet: the first real costume change from the app has still to be made and checked.";
  // Signed out and in again, in the same run. A plate no later read has confirmed is not kept:
  // Hiroba draws a blank one for a session it ended unseen, so it is asked for again. Once a read
  // has confirmed it, it is kept, and the read after the next sign-in asks Hiroba for no plate
  // (the user's call, 2026-09-28: no picture is deleted at sign-out).
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
 * asks for no picture: the switch keeps the window seen however it is covered.
 */
async function launch({ writes, now }: { writes: boolean; now: string }) {
  const args = [`--remote-debugging-port=${CDP_PORT}`, "--disable-backgrounding-occluded-windows"];
  const proc = Bun.spawn([String(electronPath), root, ...args], {
    env: {
      ...process.env,
      ABTH_DEV_HIROBA_ORIGIN: HIROBA,
      ABTH_DEV_IDP_HOST: IDP_HOST,
      ABTH_DEV_USER_DATA: USER_DATA,
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
  return {
    evaluate<T = unknown>(expression: string): Promise<T> {
      const id = nextId++;
      socket.send(
        JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true, awaitPromise: true },
        }),
      );
      return new Promise((resolve) => waiting.set(id, resolve as (value: unknown) => void));
    },
  };
}
