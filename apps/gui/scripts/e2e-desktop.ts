/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again, a rotated session,
 * every どんメダル state, a dan-less, title-less, region-less my page, a set favourite song and a
 * filled favourites folder, costume writes (a colour and a きぐるみ, each undone, the #22 trap, a
 * save that moves nothing, pre-checks that stop, a post sent to the login page, an undo after a
 * change made elsewhere, and a session that ends before and after a save), a lost session, cancel,
 * a sign-in sent off both sites, a reopen that keeps the session and the undo, Hiroba's daily
 * break, sign-out, and a reopen that stays signed out with the write gate shut and, signed in,
 * shows the editor's button shut and why, against scripts/mock-hiroba.ts, over the Chrome DevTools
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
/** Every request the mock saw since the last reset, as "METHOD /path". */
const requestLog = async () => (await (await fetch(`${HIROBA}/__log`)).json()) as string[];
const resetLog = () => fetch(`${HIROBA}/__log-reset`);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
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
  results.profileShown = (await textOf("#crowns-silver")) === "11";
  // What the panel card adds up from the mock's fixed counts: crowns 11, 2 and 1, and ranks 8 down
  // to 2 at 3, 12, 25, 31, 18, 9 and 4. Each total's id names the ranks it adds up.
  const panelTotals: Record<string, string> = {
    "#crowns-cleared": "14",
    "#crowns-full-combo": "3",
    "#ranks-total-2-3-4": "31",
    "#ranks-total-5-6-7": "68",
    "#ranks-total-8": "3",
    "#ranks-total-5-6-7-8": "71",
    "#panel-level": "panel 5",
  };
  const shownTotals: Record<string, string | null> = {};
  for (const selector of Object.keys(panelTotals)) {
    shownTotals[selector] = await textOf(selector);
  }
  results.panelTotalsShown =
    JSON.stringify(shownTotals) === JSON.stringify(panelTotals) &&
    (await page.evaluate<string | null>(
      `document.querySelector("#ranks-total-5-6-7-8")?.previousElementSibling?.textContent ?? null`,
    )) === "雅 tier or better";
  // The crowns cover the panel's charts only, so they sit under its heading and footnote with the
  // ranks, not in a card of their own that reads as every chart the account has cleared.
  results.crownsUnderPanelNote =
    (await textOf("#panel h2")) === "Hiroba's overall panel" &&
    (await page.evaluate<boolean>(
      `["#crowns", "#ranks", "#panel-footnote"].every((part) => document.querySelector("#panel " + part) !== null)`,
    ));
  const rendered = await page.evaluate<string>("document.documentElement.outerHTML");
  results.tokenInRendererDom = rendered.includes(tokens[0] ?? "?");
  // The mock serves the 九段 label at first. Its URL carries a taiko number, as Hiroba's does: only
  // the dan read off it may reach the window, never the URL or the number.
  results.danShownByName =
    (await textOf("#dan")) === "Dan: 九段" && (await textOf("#dan-unreadable")) === null;
  results.taikoNoAndUrlsKeptOutOfDom =
    !rendered.includes("000000000000") && !rendered.includes("imgsrc");
  results.readsAfterSignIn = await myPageHits();

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
    (await textOf("#crowns-silver")) === "11" &&
    !(await text()).includes("ended");

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
    (await textOf("#crowns-silver")) === "11" &&
    (await textOf("#rank-8")) === "3" &&
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
  results.unsetRegionLeftOut = (await textOf("#region")) === null;
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
  const afterGif = await page.evaluate<string>("document.documentElement.outerHTML");
  results.unreadableDanShownWithTheRest =
    (await textOf("#dan-unreadable")) === "Dan: couldn't read" &&
    (await textOf("#dan-code")) ===
      "Code for a report: dan=notPng status=200 type=image/gif bytes=43" &&
    (await textOf("#dan")) === null &&
    (await textOf("#crowns-silver")) === "11" &&
    !afterGif.includes("000000000000") &&
    !afterGif.includes("imgsrc");
  // Three reads with a dan (complete, odd and no medal), two without (dan-less, favourites), and
  // one with a label that did not read.
  results.twoRequestsWithDanOneWithout =
    JSON.stringify(requestsPerRead) === JSON.stringify([2, 2, 2, 1, 1, 2]);
  await fetch(`${HIROBA}/__variant?dan=14&label=png&title=set&region=set&favorites=unset`);

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

  // A colour alone: exactly the planned requests, the ajax headers on both posts, one field moved.
  await resetLog();
  await fetch(`${HIROBA}/__posts?reset=1`);
  const colourOutcome = await changeInTheWindow(() => click("#swatch-colorFace-3"));
  results.colourApplied = colourOutcome === "applied";
  results.colourSentOnlyThePlannedRequests = same(await requestLog(), [
    "GET /mypage_kisekae.php",
    ...WRITE_REQUESTS,
  ]);
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
    same(await requestLog(), WRITE_REQUESTS);
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
    same(await requestLog(), ["GET /mypage_top.php", "GET /mypage_kisekae.php"]);

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
  const windowNow = await page.evaluate<string>("document.documentElement.outerHTML");
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
 */
async function launch({ writes, now }: { writes: boolean; now: string }) {
  const proc = Bun.spawn([String(electronPath), root, `--remote-debugging-port=${CDP_PORT}`], {
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
