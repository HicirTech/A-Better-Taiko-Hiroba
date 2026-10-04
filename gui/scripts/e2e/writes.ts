import type { VerbsQueued } from "../../src/session-port";
import { INITIAL_PROFILE } from "../mock-profile";
import { DAN_LABEL, HIROBA } from "./config";
import type { Ctx } from "./context";
import { costumeHelpers } from "./costume-helpers";
import { pageHelpers, same, waitFor } from "./harness";
import { sessionHelpers } from "./session";
import {
  COLOUR_REQUESTS,
  hitsOn,
  myDonsSettled,
  NAME_REQUESTS,
  PREVIEW,
  requestLog,
  requestsSettled,
  resetLog,
  runThen,
  START,
  sameBesideLanePictures,
  savedCostume,
  sentAsPlanned,
  THUMBNAIL,
  TITLE_PAGE,
  TITLE_REQUESTS,
  titleOf,
} from "./stand-in";

export const bridgeWritesKeys = [
  "trapRefusedUnsent",
  "previewWaitsOutAWrite",
  "pictureWaitsOutAWrite",
  "signOutShutWhileAWriteRuns",
  "noReadInsideAWrite",
  "noopSaveNotApplied",
  "precheckStopsTheSave",
  "postToLoginKeepsTheSession",
  "postRedirectFollowedAsABrowserDoes",
  "saveAfterAChangeElsewhereStopsAndKeepsTheDraft",
  "noticeGoesWithTheNextPick",
  "saveStoppedForAMovedSetGoesOnceTheEditorHasIt",
] as const;

export async function bridgeWrites(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { exists, fabState, swipe, touchEmulated } = pageHelpers(page);
  const {
    bridgeChange,
    inStep,
    openFreshEditor,
    pressedOf,
    readEditorAgain,
    savable,
    savedFrom,
    stepOf,
  } = costumeHelpers(ctx.app);
  const { pullFrom, pulledBy } = state.pull;

  // Wait for the My Don fetched after those changes, before the log is read.
  await goTo("overview");
  await myDonsSettled();

  await resetLog();
  const trap = await bridgeChange({ ...START, costume1: 36 });
  results.trapRefusedUnsent =
    same(trap, { kind: "invalidTarget", field: "costume1" }) &&
    sameBesideLanePictures(await requestLog(), ["GET /mypage_kisekae.php"]);

  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeHeld = await hitsOn("/ajax/check_ip_kisekae.php");
  const heldWrite = bridgeChange({ ...START, colorLimb: 20 });
  await waitFor(
    "held pre-check",
    async () => (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeHeld || undefined,
  );
  const previewDuringWrite = page.evaluate<boolean>(
    `window.abth.previewCostume(${JSON.stringify({ ...START, colorBody: 39 })}).then((result) => result.ok)`,
  );
  await Bun.sleep(300);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  results.previewWaitsOutAWrite =
    (await heldWrite).kind === "applied" &&
    (await previewDuringWrite) &&
    sameBesideLanePictures(await requestLog(), [...COLOUR_REQUESTS, PREVIEW]);
  await fetch(`${HIROBA}/__state?reset=1`);

  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeThumbnail = await hitsOn("/ajax/check_ip_kisekae.php");
  const writeBeforeThumbnail = bridgeChange({ ...START, colorLimb: 20 });
  await waitFor(
    "held pre-check",
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
    same(await requestLog(), [...COLOUR_REQUESTS, THUMBNAIL]);
  await fetch(`${HIROBA}/__state?reset=1`);

  await openFreshEditor();
  await click("#costume-part-colorLimb");
  await click("#swatch-colorLimb-20");
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeHeldSave = await hitsOn("/ajax/check_ip_kisekae.php");
  await click("#costume-save");
  await waitFor(
    "held pre-check",
    async () => (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeHeldSave || undefined,
  );
  const fabShutInWrite = (await fabState()).shut;
  await goTo("settings");
  const signOutShutInWrite = await page.evaluate<boolean>(
    `document.querySelector("#sign-out")?.disabled === true`,
  );
  const signedInInWrite = (await textOf("#account-who")) === "Signed in";
  await goTo("costume");
  const savingOnReturn = (await stepOf()) === "saving";
  await click("#read-again");
  await touchEmulated(true);
  await swipe(pullFrom, pulledBy(0, 200));
  await touchEmulated(false);
  await Bun.sleep(300);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  results.signOutShutWhileAWriteRuns = signOutShutInWrite && signedInInWrite && savingOnReturn;
  await inStep("editing");
  results.noReadInsideAWrite =
    fabShutInWrite &&
    !(await exists("#write-outcome")) &&
    sentAsPlanned(await requestLog(), [], COLOUR_REQUESTS) &&
    same(await savedCostume(), { ...START, colorLimb: 20 });
  await fetch(`${HIROBA}/__state?reset=1`);

  await fetch(`${HIROBA}/__noop-save`);
  const noop = await bridgeChange({ ...START, colorLimb: 20 });
  results.noopSaveNotApplied =
    noop.kind === "notApplied" &&
    same(noop.reason, { kind: "unchanged" }) &&
    same(await savedCostume(), START);

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

  await fetch(`${HIROBA}/__post-to-login?on=1`);
  const atLogin = await bridgeChange({ ...START, colorLimb: 20 });
  await fetch(`${HIROBA}/__post-to-login?on=0`);
  results.postToLoginKeepsTheSession =
    atLogin.kind === "stoppedBeforeWrite" &&
    atLogin.reason === "precheckAtLogin" &&
    (await page.evaluate<boolean>("window.abth.isSignedIn()"));

  // 302 and 303 end at my page; 307 and 308 would repeat the post, so they are not followed.
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

  await openFreshEditor();
  await click("#swatch-colorFace-3");
  await fetch(`${HIROBA}/__state?color_body=40`);
  const savesBeforeStaleSave = await hitsOn("/ajax/change_mydon.php");
  const staleOutcome = await savedFrom(await savedCostume());
  results.saveAfterAChangeElsewhereStopsAndKeepsTheDraft =
    staleOutcome === "changedSincePreview" &&
    (await hitsOn("/ajax/change_mydon.php")) === savesBeforeStaleSave &&
    (await savedCostume()).colorBody === 40 &&
    (await pressedOf("#swatch-colorFace-3")) === "true" &&
    (await savable());
  await click("#costume-part-colorBody");
  await click("#costume-part-colorFace");
  const noticeStaysThroughTabs = await exists("#write-outcome");
  await click("#swatch-colorFace-3");
  results.noticeGoesWithTheNextPick = noticeStaysThroughTabs && !(await exists("#write-outcome"));
  // Pressed again, the draft goes over the set Hiroba shows now, which the stop brought in.
  results.saveStoppedForAMovedSetGoesOnceTheEditorHasIt =
    (await savedFrom(await savedCostume())) === "applied" &&
    same(await savedCostume(), { ...START, colorFace: 3 });
  // Hiroba's set goes back to the start, and the editor reads it.
  await fetch(`${HIROBA}/__state?reset=1`);
  await readEditorAgain();
}

export const heldWritesKeys = ["everyReadWaitsOutEveryWrite"] as const;

export async function heldWrites(ctx: Ctx) {
  const running = ctx.app;
  const { results, tokens } = ctx;

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
      // A set never drawn this run each time: a picture already held would come from memory.
      call: `window.abth.previewCostume({ ...${JSON.stringify(START)}, colorBody: (window.unseenBody = (window.unseenBody ?? 40) + 1) }).then((result) => result.ok)`,
      requests: [PREVIEW],
    },
    openFavorites: {
      call: "window.abth.openFavorites().then((result) => result.ok)",
      requests: ["GET /favorite_song_select.php", "GET /portal_favorite_song_select.php"],
    },
  };
  const readsAsked = Object.values(READS_ASKED);
  const HELD_WRITES = [
    {
      hold: "/__hold-precheck",
      reset: "/__state?reset=1",
      heldAt: "/ajax/check_ip_kisekae.php",
      run: COLOUR_REQUESTS,
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
    await waitFor("held write", async () => (await hitsOn(held.heldAt)) > heldBefore || undefined);
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
}

export const firstReadsKeys = [
  "firstTitleReadWaitsOutACostumeWrite",
  "firstEditorReadWaitsOutARename",
] as const;

export async function firstReads(ctx: Ctx) {
  const running = ctx.app;
  const { results, tokens } = ctx;
  const { signOut } = sessionHelpers(ctx);

  const stepOn = (selector: string) =>
    running.page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.dataset.step ?? null`,
    );
  const stepIs = (selector: string, step: string) =>
    waitFor(`${selector} step ${step}`, async () =>
      (await stepOn(selector)) === step ? true : undefined,
    );
  await running.goTo("costume");
  await stepIs("#costume-page", "editing");
  await running.click("#swatch-colorFace-3");
  await Bun.sleep(600);
  await resetLog();
  await fetch(`${HIROBA}/__hold-precheck?on=1`);
  const prechecksBeforeFirstRead = await hitsOn("/ajax/check_ip_kisekae.php");
  const titleReadsBeforeFirstRead = await hitsOn(TITLE_PAGE);
  await running.click("#costume-save");
  await waitFor(
    "held pre-check",
    async () =>
      (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeFirstRead || undefined,
  );
  await running.goTo("nameTitle");
  await Bun.sleep(400);
  const pickerShut = () =>
    running.page.evaluate<boolean | null>(
      `document.querySelector("#title-pick")?.disabled ?? null`,
    );
  const pickerShutWhileHeld = await pickerShut();
  const titleReadsWhileHeld = await hitsOn(TITLE_PAGE);
  await fetch(`${HIROBA}/__hold-precheck?on=0`);
  await stepIs("#title-section", "idle");
  await waitFor("title picker enabled", async () =>
    (await pickerShut()) === false ? true : undefined,
  );
  const titleReadsAfterTheWrite = await hitsOn(TITLE_PAGE);
  // The arrow opens the picker once the field has the focus; pressed again until a read starts.
  await waitFor("title read", async () => {
    if ((await hitsOn(TITLE_PAGE)) > titleReadsAfterTheWrite) {
      return true;
    }
    await running.page.evaluate(`document.querySelector("#title-pick").focus()`);
    for (const type of ["keyDown", "keyUp"]) {
      await running.page.send("Input.dispatchKeyEvent", {
        type,
        key: "ArrowDown",
        code: "ArrowDown",
        windowsVirtualKeyCode: 40,
      });
    }
    await Bun.sleep(500);
    return undefined;
  });
  results.firstTitleReadWaitsOutACostumeWrite =
    pickerShutWhileHeld === true &&
    titleReadsWhileHeld === titleReadsBeforeFirstRead &&
    titleReadsAfterTheWrite === titleReadsBeforeFirstRead &&
    runThen(await requestsSettled(COLOUR_REQUESTS.length + 1), COLOUR_REQUESTS, [
      `GET ${TITLE_PAGE}`,
    ]);
  await fetch(`${HIROBA}/__state?reset=1`);

  await signOut();
  await running.click("#sign-in");
  await running.until("サンプルどん");
  tokens.push((await (await fetch(`${HIROBA}/__last-token`)).text()).trim());
  await running.goTo("nameTitle");
  await stepIs("#name-section", "idle");
  await running.page.evaluate(
    `(() => { const input = document.querySelector("#name-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "あたらしい"); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
  );
  await waitFor("name save enabled", async () =>
    (await running.page.evaluate<boolean>(
      `document.querySelector("#name-save").disabled === false`,
    ))
      ? true
      : undefined,
  );
  await resetLog();
  await fetch(`${HIROBA}/__profile-hold-save?on=1`);
  const savesBeforeFirstRead = await hitsOn("/ajax/change_mydon_profile.php");
  const editorReadsBeforeFirstRead = await hitsOn("/mypage_kisekae.php");
  await running.click("#name-save");
  await waitFor(
    "held name save",
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
}
