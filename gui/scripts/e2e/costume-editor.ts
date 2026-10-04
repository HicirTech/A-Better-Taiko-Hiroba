import { LONG_PRESS_MS } from "../../src/my-page/use-long-press";
import { COSTUME_FIELDS } from "../mock-costume";
import { HIROBA, MY_DON_GIF_CODE, PHONE } from "./config";
import type { Ctx } from "./context";
import { costumeHelpers, PNG_URL } from "./costume-helpers";
import {
  hoverOver,
  middleOf,
  pageHelpers,
  SPACE,
  same,
  waitFor,
  waitForSeen,
  withoutPictureBytes,
} from "./harness";
import {
  COLOUR_REQUESTS,
  editorHits,
  hitsOn,
  myDonsAsked,
  myDonsSettled,
  myPageHits,
  previewQueries,
  previewQuery,
  requestLog,
  resetLog,
  START,
  savedCostume,
  sentAsPlanned,
  thumbsSettled,
} from "./stand-in";

export async function costumeEditor(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, currentPage, goTo, page, text, textOf } = ctx.app;
  const { atSize, boxOf, exists } = pageHelpers(page);
  const {
    aboveThePart,
    barFlush,
    changeInTheWindow,
    inStep,
    leaveTheCostumePage,
    pressedOf,
    previewOtherThan,
    previewSrc,
    readEditorAgain,
    savable,
    stepOf,
  } = costumeHelpers(ctx.app);
  const { myDonsFailed } = state;

  const editorReadsAtStart = await editorHits();
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#costume-open");
  await waitFor("costume page", async () => (await currentPage()) === "costume" || undefined);
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
  results.writesOpenWithNoFlag =
    (await exists("#costume-save")) &&
    (await page.evaluate<string>("typeof window.abth.enabledWrites")) === "undefined";

  await goTo("overview");
  await goTo("costume");
  await inStep("editing");
  await Bun.sleep(500);
  results.editorReadOnceWhenOpened =
    editorReadsOnOpening === 1 && (await editorHits()) === 1 && (await stepOf()) === "editing";
  results.previewKeptBetweenVisits =
    (await previewSrc()) === onOpening && same(await previewQueries(), [previewQuery(START)]);
  const wornItems = [1, 2, 3, 4, 5].flatMap((slot) => {
    const item = START[`costume${slot}`];
    return item === undefined || item === 0 ? [] : [`${slot}/${item}`];
  });
  const tiledThumbs = await thumbsSettled();
  results.tileThumbnailsAskedOnceEach =
    same(tiledThumbs.map(({ type, cos }) => `${type}/${cos}`).sort(), wornItems.sort()) &&
    tiledThumbs.every(({ referer }) => referer === `${HIROBA}/mypage_kisekae.php`);

  await click("#swatch-colorFace-3");
  results.noChangeSummaryShown =
    !(await exists("#costume-changes")) &&
    !(await exists("#costume-no-changes")) &&
    !(await text()).includes("Changes") &&
    !(await text()).includes("Nothing changed yet");
  await goTo("overview");
  await goTo("costume");
  await inStep("editing");
  results.draftSurvivesAPageSwitch =
    (await pressedOf("#swatch-colorFace-3")) === "true" &&
    (await savable()) &&
    (await editorHits()) === 1;
  await click("#costume-reset");
  results.resetRestoresTheSet =
    (await pressedOf("#swatch-colorFace-5")) === "true" &&
    (await pressedOf("#swatch-colorFace-3")) === "false" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#costume-reset").disabled && document.querySelector("#costume-save").disabled`,
    ));

  const myPageReadsBeforeAgain = await myPageHits();
  await readEditorAgain();
  results.readAgainReadsTheEditorHere =
    (await editorHits()) === 2 && (await myPageHits()) === myPageReadsBeforeAgain;
  await click("#swatch-colorFace-3");
  await readEditorAgain();
  results.readAgainKeepsADraftOverAnUnchangedSet =
    (await pressedOf("#swatch-colorFace-3")) === "true" && (await savable());
  await fetch(`${HIROBA}/__state?color_body=40`);
  await readEditorAgain();
  await click("#costume-part-colorBody");
  const bodyAsRead = (await pressedOf("#swatch-colorBody-40")) === "true";
  await click("#costume-part-colorFace");
  results.readAgainDropsADraftOverAMovedSet =
    bodyAsRead &&
    (await pressedOf("#swatch-colorFace-5")) === "true" &&
    (await pressedOf("#swatch-colorFace-3")) === "false" &&
    !(await savable());
  await fetch(`${HIROBA}/__state?reset=1`);
  await readEditorAgain();

  results.saveBarStaysAtTheBottom = await atSize(PHONE.width, PHONE.height, async () => {
    const whileEditing = await barFlush();
    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    const scrolledToTheEnd = await barFlush();
    await page.evaluate("window.scrollTo(0, 0)");
    await click("#swatch-colorFace-3");
    const withADraft = await barFlush();
    await click("#costume-reset");
    return whileEditing && scrolledToTheEnd && withADraft;
  });

  const framedPage = async () => ({
    page: await boxOf("#costume-page"),
    frame: await boxOf("main .MuiContainer-root"),
  });
  const onAWideWindow = await atSize(1920, 1080, async () => {
    const costume = await framedPage();
    await goTo("settings");
    const settings = await boxOf("main .MuiContainer-root");
    await goTo("costume");
    await inStep("editing");
    return { costume, settings };
  });
  const justNarrow = await atSize(700, 800, framedPage);
  const onAPhone = await atSize(PHONE.width, PHONE.height, framedPage);
  results.costumePageIsAColumnOnANarrowWindow =
    justNarrow.page.width <= 601 &&
    Math.abs(
      (justNarrow.page.left + justNarrow.page.right) / 2 -
        (justNarrow.frame.left + justNarrow.frame.right) / 2,
    ) < 2 &&
    Math.abs(onAPhone.page.width - (onAPhone.frame.width - 2 * 16)) < 2;
  results.costumePageUsesTheWidthOfAWideWindow =
    Math.abs(onAWideWindow.costume.frame.width - 1200) < 1 &&
    Math.abs(onAWideWindow.costume.page.width - (onAWideWindow.costume.frame.width - 2 * 24)) < 2 &&
    Math.abs(onAWideWindow.costume.page.left - (onAWideWindow.costume.frame.left + 24)) < 2 &&
    Math.abs(onAWideWindow.settings.width - 900) < 1;
  await goTo("overview");

  await fetch(`${HIROBA}/__noop-save`);
  const noChange = await changeInTheWindow(() => click("#swatch-colorFace-3"));

  results.failedSaveKeepsTheNoticeAndDraft =
    noChange === "notApplied" &&
    (await aboveThePart("#write-outcome")) &&
    (await stepOf()) === "editing" &&
    (await pressedOf("#swatch-colorFace-3")) === "true" &&
    (await savable()) &&
    same(await savedCostume(), START);
  await leaveTheCostumePage();
  results.myDonNotAskedAfterNoChange =
    noChange === "notApplied" &&
    (await myDonsSettled()) === myDonsFailed &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE &&
    same(await savedCostume(), START);
}

export async function portraitPreview(ctx: Ctx) {
  const { results, state, tokens } = ctx;
  const { click, currentPage, goTo, page, textOf } = ctx.app;
  const { attribute, column, exists, press, sameColumn, swipe, touchClicks } = pageHelpers(page);
  const {
    inStep,
    leaveTheCostumePage,
    pageOutcome,
    previewOtherThan,
    previewSrc,
    savable,
    stepOf,
  } = costumeHelpers(ctx.app);
  const { columnOnOverview, columnOnSettings, overviewScrolls } = state;

  const OPEN_COSTUME = "Open the Costume page";
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await hoverOver(page, "#costume-open");
  const nameOnHover = await waitFor(
    "portrait tooltip",
    async () => (await textOf('[role="tooltip"]')) ?? undefined,
  );
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  results.portraitIsTheCostumeButton =
    (await page.evaluate<boolean>(
      `(() => { const portrait = document.querySelector("#costume-open"); return portrait?.tagName === "BUTTON" && portrait.querySelector("#my-don") !== null && portrait.querySelector("#costume-open-badge") === null && [...document.querySelectorAll("button")].every((button) => button.textContent.trim() !== ${JSON.stringify(OPEN_COSTUME)}) && !portrait.disabled; })()`,
    )) &&
    (await attribute("#costume-open", "aria-label")) === OPEN_COSTUME &&
    nameOnHover === OPEN_COSTUME;

  const openedBy = async (keys: () => Promise<unknown>) => {
    await page.evaluate(`document.querySelector("#costume-open").focus()`);
    await keys();
    const opened = await waitFor(
      "costume page by keys",
      async () => (await currentPage()) === "costume" || undefined,
      5_000,
    );
    await goTo("overview");
    return opened;
  };

  const openedByKeys = async () =>
    (await openedBy(() => press("Enter"))) &&
    (await openedBy(async () => {
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...SPACE, text: " " });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...SPACE });
    }));
  const openedByKeysWithMouse = await openedByKeys();

  await page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  const longPressHint = await waitFor("long-press hint", () =>
    page.evaluate<string | undefined>(
      `document.getElementById(document.querySelector("#costume-open").getAttribute("aria-describedby") ?? "")?.textContent`,
    ),
  );
  results.portraitJumpsToCostumeByKeyboard = openedByKeysWithMouse && (await openedByKeys());
  await page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
  await page.evaluate(
    `window.touchClicks = []; document.addEventListener("click", (event) => window.touchClicks.push(event.pointerType), true)`,
  );

  const onPortrait = await middleOf(page, "#costume-open");
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [onPortrait] });
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const tapClicked = await waitFor(
    "tap click",
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
    "costume page by long press",
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
    (await stepOf()) === "editing" &&
    (await pageOutcome()) === "notApplied";
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: false });

  // Opened by the long-press, the page still shows the notice of the save that moved nothing,
  // until Reset.
  await inStep("editing");
  await click("#costume-reset");
  results.noticeGoesWithReset = !(await exists("#write-outcome")) && !(await savable());
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
  await fetch(`${HIROBA}/__preview?answer=gif`);
  await click("#swatch-colorFace-20");
  await waitFor(
    "preview unavailable notice",
    async () => (await exists("#costume-preview-unavailable")) || undefined,
  );
  results.previewFailureLeavesTheEditor =
    (await textOf("#costume-preview-code")) ===
      "Code for a report: preview=notPng status=200 type=image/gif bytes=43" &&
    (await previewSrc()) === afterBurst &&
    (await savable());
  await fetch(`${HIROBA}/__preview?answer=png`);
  await fetch(`${HIROBA}/__previews?reset=1`);
  await click("#swatch-colorFace-21");
  await leaveTheCostumePage();
  await Bun.sleep(800);
  results.previewNoneOnceShut = same(await previewQueries(), []);
}

export async function costumeWrite(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { atSize, attribute, boxOf, exists, press } = pageHelpers(page);
  const {
    aboveThePart,
    buttonsIn,
    changeInTheWindow,
    historyClosed,
    historyNow,
    historyTiles,
    inStep,
    notPictures,
    openHistory,
    pickFromHistory,
    pressedOf,
    savable,
    savedFrom,
    showPart,
    stepOf,
  } = costumeHelpers(ctx.app);

  const myDonsBeforeColour = await myDonsSettled();
  const myDonBeforeColour = await attribute("#my-don-image", "src");
  await resetLog();
  await fetch(`${HIROBA}/__posts?reset=1`);
  const colourOutcome = await changeInTheWindow(() => click("#swatch-colorFace-3"), true);
  results.colourApplied = colourOutcome === "applied";
  results.appliedShowsNoNotice =
    !(await exists("#write-outcome")) && (await stepOf()) === "editing";
  results.colourSentOnlyThePlannedRequests = sentAsPlanned(
    await requestLog(),
    ["GET /mypage_kisekae.php"],
    COLOUR_REQUESTS,
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

  results.saveIsOneClick =
    !(await exists("#costume-review")) &&
    !(await exists("#costume-back")) &&
    same(
      (await buttonsIn("#costume-actions")).map(({ id }) => id),
      ["costume-save", "costume-history", "costume-reset"],
    ) &&
    posts.filter((post) => post.path === "/ajax/change_mydon.php").length === 1;
  await goTo("overview");
  await waitForSeen(
    "My Don asked again",
    page,
    async () => (await myDonsAsked()).length > myDonsBeforeColour || undefined,
  );
  const myDonsAfterColour = await myDonsSettled();
  const myDonAfterColour = await attribute("#my-don-image", "src");
  const noticeElsewhere = async () =>
    (await exists("#write-outcome")) || (await exists(".MuiSnackbar-root"));
  const noticeOnOverview = await noticeElsewhere();
  await goTo("favorites");
  await Bun.sleep(1000);
  const noticeOnFavorites = await noticeElsewhere();
  await goTo("costume");
  await inStep("editing");
  results.savedCostumeLeavesNoMessageAnywhere =
    !noticeOnOverview && !noticeOnFavorites && !(await noticeElsewhere());

  const firstHistory = await historyNow();
  results.historyListsTheNewSetFirstAndTheOldSecond =
    same(
      firstHistory.map(({ set }) => set),
      [{ ...START, colorFace: 3 }, START],
    ) && firstHistory.every(({ picture }) => picture?.startsWith(PNG_URL) === true);
  const requestsBeforeHistory = notPictures(await requestLog());
  await openHistory();
  const tiles = await historyTiles();
  const dialogFacts = await page.evaluate<Record<string, unknown>>(
    `(() => { const dialog = document.querySelector('[role="dialog"]'); const title = document.getElementById(dialog?.getAttribute("aria-labelledby") ?? ""); return { modal: dialog?.getAttribute("aria-modal"), title: title?.textContent ?? null }; })()`,
  );
  results.historyDialogListsEntriesAsNamedButtons =
    same(dialogFacts, { modal: "true", title: "Costume history" }) &&
    same(
      tiles.map(({ tag, label }) => [tag, label]),
      [
        ["BUTTON", "Costume 1, worn now"],
        ["BUTTON", "Costume 2"],
      ],
    ) &&
    same(
      tiles.map(({ src }) => src),
      firstHistory.map(({ picture }) => picture),
    );
  results.historyMarksTheSetWornNow =
    same(
      tiles.map(({ worn }) => worn),
      [true, false],
    ) && (await textOf("#costume-history-worn")) === "Worn now";
  const wideDialog = await boxOf('[role="dialog"]');
  await Bun.sleep(300);
  results.historyAsksHirobaNothing = same(notPictures(await requestLog()), requestsBeforeHistory);
  await press("Escape");
  await historyClosed();
  const focusAfterEscape = await waitFor(
    "focus back after Escape",
    async () =>
      (await page.evaluate<string>("document.activeElement?.id ?? ''")) === "costume-history" ||
      undefined,
  );
  await openHistory();
  await click("#costume-history-close");
  await historyClosed();
  const focusAfterClose = await waitFor(
    "focus back after Close",
    async () =>
      (await page.evaluate<string>("document.activeElement?.id ?? ''")) === "costume-history" ||
      undefined,
  );
  results.historyDialogClosesByEscapeAndButtonAndGivesFocusBack =
    focusAfterEscape && focusAfterClose && (await stepOf()) === "editing" && !(await savable());
  // On a phone the button is the bar's, another element: the dialog from it gives focus back.
  const historyOnAPhone = await atSize(PHONE.width, PHONE.height, async () => {
    await openHistory();
    const dialog = await waitFor("full-screen history dialog", async () => {
      const box = await boxOf('[role="dialog"]');
      return box.width >= 479 ? box : undefined;
    });
    await press("Escape");
    await historyClosed();
    const focusBack = await waitFor(
      "focus back on a phone",
      async () =>
        (await page.evaluate<string>("document.activeElement?.id ?? ''")) === "costume-history" ||
        undefined,
    );
    return { dialog, focusBack };
  });
  results.historyDialogFullScreenOnANarrowWindow =
    wideDialog.width <= 600 &&
    historyOnAPhone.dialog.left < 1 &&
    historyOnAPhone.dialog.right > 479 &&
    historyOnAPhone.dialog.bottom - historyOnAPhone.dialog.top >= 799 &&
    historyOnAPhone.focusBack;

  const myDonsBeforeGoingBack = await myDonsSettled();
  await pickFromHistory(1);
  results.historyPickPutsTheSetInTheDraft =
    (await pressedOf("#swatch-colorFace-5")) === "true" &&
    (await pressedOf("#swatch-colorFace-3")) === "false" &&
    (await savable());
  const backOutcome = await savedFrom(await savedCostume());
  results.historyPickSavesLikeAnyChange =
    backOutcome === "applied" && same(await savedCostume(), START);
  const afterGoingBack = await historyNow();
  results.historyHoldsEachSetOnceAfterGoingBack =
    same(
      afterGoingBack.map(({ set }) => set),
      [START, { ...START, colorFace: 3 }],
    ) && afterGoingBack.every(({ picture }) => picture?.startsWith(PNG_URL) === true);
  await goTo("overview");
  await waitForSeen(
    "My Don asked after going back",
    page,
    async () => (await myDonsAsked()).length > myDonsBeforeGoingBack || undefined,
  );
  results.myDonAgainAfterWrite =
    myDonsAfterColour === myDonsBeforeColour + 1 &&
    myDonAfterColour?.startsWith("data:image/png;base64,") === true &&
    myDonAfterColour !== myDonBeforeColour &&
    (await myDonsSettled()) === myDonsAfterColour + 1 &&
    (await attribute("#my-don-image", "src")) === myDonBeforeColour;

  let kigurumiInfoAboveThePart = false;
  let kigurumiBlanksTheOtherTiles = false;
  const kigurumiOutcome = await changeInTheWindow(async () => {
    await showPart("costume1");
    await waitFor("Mascot tile", async () => (await exists("#item-costume1-36")) || undefined);
    await click("#item-costume1-36");
    await waitFor("kigurumi warning", async () => (await exists("#kigurumi-warning")) || undefined);
    kigurumiInfoAboveThePart = await aboveThePart("#kigurumi-warning");
    kigurumiBlanksTheOtherTiles = await page.evaluate<boolean>(
      `[["costume2", "Head"], ["costume3", "Body"], ["costume4", "Makeup"], ["costume5", "Mini Character"]].every(([part, name]) => document.querySelector("#costume-part-" + part + " img") === null && document.querySelector("#costume-part-" + part).getAttribute("aria-label") === name)`,
    );
  });
  results.kigurumiInfoAboveThePart = kigurumiInfoAboveThePart;
  results.kigurumiBlanksTheOtherTiles = kigurumiBlanksTheOtherTiles;
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
  const savesBeforeGoingBack = await hitsOn("/ajax/change_mydon.php");
  await pickFromHistory(1);
  results.kigurumiGoneBackInOnePost =
    (await savedFrom(await savedCostume())) === "applied" &&
    same(await savedCostume(), START) &&
    (await hitsOn("/ajax/change_mydon.php")) - savesBeforeGoingBack === 1;
}
