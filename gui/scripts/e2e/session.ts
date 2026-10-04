import { existsSync, readFileSync } from "node:fs";
import { INITIAL_PROFILE, OWNED_TITLES } from "../mock-profile";
import { type App, launch, stop } from "./app";
import { HIROBA, IN_THE_BREAK, MEDAL_PLATE, NOON_JST, PANEL_ART, SESSION_FILE } from "./config";
import type { Ctx } from "./context";
import { costumeHelpers, type HistoryEntry, near } from "./costume-helpers";
import { pageHelpers, same, waitFor, waitForSeen } from "./harness";
import { overviewHelpers } from "./overview";
import {
  editorHits,
  hitsOn,
  iconsSettled,
  medalPlatesSettled,
  myDonsAsked,
  myDonsSettled,
  myPageHits,
  platesAsked,
  platesSettled,
  previewQueries,
  requestLog,
  resetLog,
  START,
  savedCostume,
  sentAsPlanned,
  thumbs,
  thumbsSettled,
} from "./stand-in";

export function sessionHelpers(ctx: Ctx) {
  const panelArtShownOn = (app: App) =>
    waitForSeen(
      "score panel picture",
      app.page,
      async () =>
        (await app.page.evaluate<boolean>(
          `document.querySelector("#score-panel-image") !== null`,
        )) || undefined,
    );

  // The launch's read is the session's first, which renews nothing.
  const myDonShownOn = (app: App) =>
    waitForSeen(
      "My Don picture",
      app.page,
      async () =>
        (await app.page.evaluate<boolean>(`document.querySelector("#my-don-image") !== null`)) ||
        undefined,
    );

  const medalPlateShown = async () => {
    await ctx.app.page.evaluate(
      `document.querySelector("#medal").scrollIntoView({ block: "center" })`,
    );
    await waitForSeen(
      "medal plate picture",
      ctx.app.page,
      async () =>
        (await ctx.app.page.evaluate<boolean>(
          `document.querySelector("#medal-plate-image") !== null`,
        )) || undefined,
    );
    const fetched = await medalPlatesSettled();
    await ctx.app.page.evaluate("window.scrollTo(0, 0)");
    return fetched;
  };

  const shownOnReopen = (selector: string) =>
    ctx.app.page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);

  const signOut = async () => {
    await ctx.app.goTo("settings");
    const offered = (await ctx.app.textOf("#sign-out")) === "Sign out";
    await ctx.app.click("#sign-out");
    await ctx.app.until("Sign in to Hiroba");
    return offered && (await ctx.app.currentPage()) === "overview";
  };

  return { panelArtShownOn, myDonShownOn, medalPlateShown, shownOnReopen, signOut };
}

export async function sessionExpiry(ctx: Ctx) {
  const { results, tokens } = ctx;
  const { click, clickButton, goTo, page, until } = ctx.app;
  const { atSize, boxOf, exists } = pageHelpers(page);
  const { bridgeChange, inStep, openFreshEditor, previewOtherThan } = costumeHelpers(ctx.app);

  await openFreshEditor();
  const postsBeforeExpiry = await hitsOn("/ajax/check_ip_kisekae.php");
  await click("#swatch-colorFace-9");
  await fetch(`${HIROBA}/__expire`);
  await Bun.sleep(100);
  await click("#costume-save");
  await until("Hiroba ended the session before anything was saved");
  results.sessionGoneBeforeSaveSendsNothing =
    (await hitsOn("/ajax/check_ip_kisekae.php")) === postsBeforeExpiry &&
    (await exists("#sign-in")) &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));
  const signInCardWidth = async (to: "overview" | "costume") => {
    await goTo(to);
    return (await boxOf("#sign-in-card")).width;
  };
  const cardWidths = await atSize(1920, 1080, async () => ({
    overview: await signInCardWidth("overview"),
    costume: await signInCardWidth("costume"),
  }));
  results.costumeSignInCardAsWideAsTheOverviews =
    cardWidths.overview <= 900 && near(cardWidths.costume, cardWidths.overview);

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
  const editorAfterTheLostSave = await page.evaluate<{ ok: boolean; value?: { state: unknown } }>(
    "window.abth.openCostumeEditor()",
  );
  results.sessionGoneAfterSaveIsDroppedAndTheEditorShowsTheSet =
    droppedAfterSave &&
    editorAfterTheLostSave.ok &&
    same(editorAfterTheLostSave.value?.state, { ...START, colorFace: 7 });
  // The checks after the reopen start from the set the lost save left.
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

  await fetch(`${HIROBA}/__offsite?on=1`);
  await click("#sign-in");
  await until("offsite.127.0.0.1.sslip.io:8808, which this app does not open");
  await fetch(`${HIROBA}/__offsite?on=0`);
  results.refusalNamed = true;

  await page.evaluate(
    `(() => { window.firstCard = null; const observer = new MutationObserver(() => { if (document.querySelector("#profile") === null) return; window.firstCard = ["#title-plate-image", "#my-don-image"].map((selector) => document.querySelector(selector) !== null); observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); })()`,
  );
  await click("#sign-in");
  await until("サンプルどん");
  await waitForSeen(
    "My Don picture",
    page,
    async () => (await exists("#my-don-image")) || undefined,
  );
  results.signInForgetsThePictures =
    same(await page.evaluate("window.firstCard"), [false, false]) &&
    (await exists("#title-plate-image"));
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
  results.sessionKept =
    existsSync(SESSION_FILE) && readFileSync(SESSION_FILE, "utf8").includes(kept);
}

export async function reopen(ctx: Ctx) {
  let running = ctx.app;
  const { results, state } = ctx;
  const { historyNow, showPartOn } = costumeHelpers(running);
  const { legendIconsShownOn } = overviewHelpers(running);
  const { medalPlateShown, myDonShownOn, panelArtShownOn, shownOnReopen, signOut } =
    sessionHelpers(ctx);
  const { iconFetches, panelArtFetches } = state;

  const historyBeforeReopen = await historyNow();
  state.historyBeforeReopen = historyBeforeReopen;
  const readsBeforeReopen = await myPageHits();
  const editorReadsBeforeReopen = await editorHits();
  const platesBeforeReopen = (await platesSettled()).length;
  const myDonsBeforeReopen = await myDonsSettled();
  const medalPlatesBeforeReopen = await medalPlatesSettled();
  const thumbsBeforeReopen = (await thumbsSettled()).length;
  await stop(running);
  running = await launch({ now: IN_THE_BREAK });
  ctx.app = running;
  await running.until("サンプルどん");
  results.signedInAfterReopen = true;
  results.readsOnReopen = (await myPageHits()) - readsBeforeReopen;
  await Bun.sleep(1000);
  results.editorNotReadOnReopen = (await editorHits()) === editorReadsBeforeReopen;
  await waitForSeen(
    "title plate picture",
    running.page,
    async () =>
      (await running.page.evaluate<boolean>(
        `document.querySelector("#title-plate-image") !== null`,
      )) || undefined,
  );
  results.plateOncePerDevice = (await platesSettled()).length === platesBeforeReopen;

  await panelArtShownOn(running);
  results.scorePanelOncePerDevice = (await hitsOn(PANEL_ART)) === panelArtFetches;
  await legendIconsShownOn(running);
  results.legendIconsOncePerDevice = (await iconsSettled()) === iconFetches;

  await myDonShownOn(running);
  results.myDonOncePerLaunch = (await myDonsSettled()) === myDonsBeforeReopen;

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

  await running.goTo("costume");
  await waitFor("history button enabled", async () =>
    (await running.page.evaluate<boolean>(
      `document.querySelector("#costume-history")?.disabled === false`,
    ))
      ? true
      : undefined,
  );
  results.historyKeptAcrossRelaunch =
    historyBeforeReopen.length > 0 &&
    same(
      await running.page.evaluate<HistoryEntry[]>("window.abth.costumeHistory()"),
      historyBeforeReopen,
    );
  results.editorReadOnceOnReopen = (await editorHits()) === editorReadsBeforeReopen + 1;
  await waitFor(
    "Mascot tile",
    async () => (await shownOnReopen("#costume-part-costume1")) || undefined,
  );
  await showPartOn(running, "costume1");
  await waitForSeen(
    "Mascot #4 picture",
    running.page,
    async () => (await shownOnReopen("#item-costume1-4 img")) || undefined,
  );
  await running.click("#costume-part-costume2");
  await waitForSeen(
    "Head #21 picture",
    running.page,
    async () => (await shownOnReopen("#item-costume2-21 img")) || undefined,
  );
  results.thumbnailsOncePerDevice = (await thumbsSettled()).length === thumbsBeforeReopen;
  await running.goTo("overview");

  results.signOutHandled = (await signOut()) && !existsSync(SESSION_FILE);
}

export async function signedOutReopen(ctx: Ctx) {
  let running = ctx.app;
  const { results, state, tokens } = ctx;
  const { legendIconsShownOn } = overviewHelpers(running);
  const { medalPlateShown, myDonShownOn, panelArtShownOn, shownOnReopen, signOut } =
    sessionHelpers(ctx);
  const { historyBeforeReopen, iconFetches, panelArtFetches } = state;

  const readsBeforeSecondReopen = await myPageHits();
  await stop(running);
  running = await launch({ now: NOON_JST });
  ctx.app = running;
  await running.until("Sign in to Hiroba");
  await Bun.sleep(500);
  results.signedOutAfterReopen = (await myPageHits()) === readsBeforeSecondReopen;
  await resetLog();
  const signedOutWrites = await running.page.evaluate(
    `Promise.all([window.abth.changeCostume(${JSON.stringify({ expected: START, target: { ...START, colorFace: 3 } })}), window.abth.costumeHistory()])`,
  );
  results.signedOutWritesSendNothing =
    same(signedOutWrites, [{ kind: "notSignedIn" }, []]) && same(await requestLog(), []);
  const platesSignedOut = (await platesAsked()).length;
  const myDonsSignedOut = (await myDonsAsked()).length;
  const medalPlatesSignedOut = await hitsOn(MEDAL_PLATE);
  const thumbsSignedOut = (await thumbs()).length;
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  const editorReadsBeforeOpening = await editorHits();
  await running.click("#costume-open");
  await waitFor(
    "costume page",
    async () => (await running.currentPage()) === "costume" || undefined,
  );
  await waitFor(
    "editing step",
    async () =>
      (await running.page.evaluate<string | null>(
        `document.querySelector("#costume-page")?.getAttribute("data-step") ?? null`,
      )) === "editing" || undefined,
  );
  results.writesOpenOnAFlaglessLaunch =
    (await running.textOf("main h1")) === "Costume" &&
    (await editorHits()) === editorReadsBeforeOpening + 1 &&
    (await running.page.evaluate<boolean>(
      `["#costume-part-colorFace", "#costume-save", "#costume-history", "#costume-actions"].every((selector) => document.querySelector(selector) !== null)`,
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
  await waitForSeen(
    "title plate picture",
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
  await legendIconsShownOn(running);
  results.legendIconsSurviveSignOut = (await iconsSettled()) === iconFetches;
  await myDonShownOn(running);
  results.myDonKeptAtSignIn = (await myDonsSettled()) === myDonsSignedOut;
  // An unconfirmed plate is asked again: Hiroba draws a blank one for a session it ended unseen.
  const plateShown = () =>
    waitForSeen(
      "title plate picture",
      running.page,
      async () =>
        (await running.page.evaluate<boolean>(
          `document.querySelector("#title-plate-image") !== null`,
        )) || undefined,
    );
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
  await waitFor(
    "title plate asked again",
    async () => (await platesAsked()).length > platesBeforeThird || undefined,
  );
  await plateShown();
  const platesUnconfirmed = (await platesSettled()).length;
  results.unconfirmedPlateAskedAgain = (await platesAfterSignOutAndIn()) === platesUnconfirmed + 1;
  await running.click("#read-again");
  await Bun.sleep(300);
  await running.until("Last updated");
  const platesBeforeSignOut = (await platesSettled()).length;
  results.playerPicturesKeptAtSignOut = (await platesAfterSignOutAndIn()) === platesBeforeSignOut;
  results.historyKeptAcrossSignOutAndIn = same(
    await running.page.evaluate<HistoryEntry[]>("window.abth.costumeHistory()"),
    historyBeforeReopen,
  );
  const historyPickAfterSignIn = async () => {
    await running.goTo("costume");
    const previewHere = () =>
      running.page.evaluate<{ src: string | null; loading: boolean }>(
        `({ src: document.querySelector("#costume-preview-image")?.getAttribute("src") ?? null, loading: document.querySelector("#costume-preview-loading") !== null })`,
      );
    await waitFor("preview and history ready", async () => {
      const { src, loading } = await previewHere();
      const historyReady = await running.page.evaluate<boolean>(
        `document.querySelector("#costume-history")?.disabled === false`,
      );
      return historyReady && src !== null && !loading ? true : undefined;
    });
    const worn = await savedCostume();
    const at = historyBeforeReopen.findIndex(
      ({ set, picture }) => picture !== null && !same(set, worn),
    );
    const picture = historyBeforeReopen[at]?.picture;
    if (picture === undefined || picture === null) {
      return false;
    }

    const hitsBefore = await hitsOn("/imgsrc_mydon.php");
    await fetch(`${HIROBA}/__previews?reset=1`);
    await running.click("#costume-history");
    await waitFor(
      "history entry",
      async () => (await shownOnReopen(`#costume-history-entry-${at}`)) || undefined,
    );
    await running.click(`#costume-history-entry-${at}`);
    await waitFor("history dialog closed", async () =>
      (await shownOnReopen("#costume-history-dialog")) ? undefined : true,
    );
    await waitFor("picked preview", async () =>
      (await previewHere()).src === picture ? true : undefined,
    );
    await Bun.sleep(800);
    const asksNothing =
      !(await shownOnReopen("#costume-preview-loading")) &&
      same(await previewQueries(), []) &&
      (await hitsOn("/imgsrc_mydon.php")) === hitsBefore;
    const draftChanged = await running.page.evaluate<boolean>(
      `document.querySelector("#costume-save").disabled === false`,
    );
    await running.click("#costume-reset");
    return asksNothing && draftChanged;
  };
  results.historyPickShowsThePictureAtOnceAsksNothing = await historyPickAfterSignIn();
  await signOut();
  tokens.push(...((await (await fetch(`${HIROBA}/__tickets`)).json()) as string[]));
  const portraits = await myDonsAsked();
  results.myDonSentNoCookie =
    portraits.length > 3 &&
    portraits.every(
      (portrait) =>
        portrait.cookies.length === 0 &&
        portrait.referer === `${HIROBA}/` &&
        portrait.query === "?v=&kind=mydon&fn=mydon_000000000000",
    );
}
