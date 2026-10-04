import { LONG_PRESS_MS } from "../../src/my-page/use-long-press";
import {
  COOLDOWN_MESSAGE,
  FILTER_MESSAGE,
  INITIAL_PROFILE,
  OWNED_TITLES,
  REFUSED_NAME,
} from "../mock-profile";
import { en, HIROBA } from "./config";
import type { Ctx } from "./context";
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
import { nameTitleHelpers, SAVE, UNLISTED_TITLE } from "./name-title-helpers";
import {
  AJAX_HEADERS,
  hitsOn,
  myDonsSettled,
  myPageHits,
  NAME_REQUESTS,
  profileAsStarted,
  profileNow,
  profilePosts,
  profileSaves,
  requestLog,
  requestsSettled,
  resetLog,
  runThen,
  START,
  sameBesideLanePictures,
  savedCostume,
  sentAsPlanned,
  TITLE_PAGE,
  TITLE_REQUESTS,
  TITLE_REREAD,
  titleOf,
} from "./stand-in";

export async function title(ctx: Ctx) {
  const { results } = ctx;
  const { goTo, page, text, textOf } = ctx.app;
  const { exists } = pageHelpers(page);
  const {
    bridgeTitle,
    changeTitleInTheWindow,
    disabledOf,
    idShownIn,
    inSection,
    inputValueOf,
    listed,
    outcomeOf,
    pickTitle,
    popupClosed,
    popupOpened,
    readTitlesAgain,
    rereadDone,
    saveSection,
    titleListIn,
    titlesRead,
  } = nameTitleHelpers(ctx.app);

  const idsShown: boolean[] = [];

  await goTo("overview");
  const titleReadsBeforeThePage = await hitsOn(TITLE_PAGE);
  await goTo("nameTitle");
  await inSection("title", "idle");
  await inSection("name", "idle");
  const wornShownUnread =
    (await hitsOn(TITLE_PAGE)) === titleReadsBeforeThePage &&
    (await titleListIn()) === "unread" &&
    (await inputValueOf("#title-pick")) === INITIAL_PROFILE.title;
  await popupOpened();
  const options = await listed();
  idsShown.push(await idShownIn('#title-section, [role="listbox"]'));
  results.titleListShown =
    titleReadsBeforeThePage === 0 &&
    wornShownUnread &&
    (await hitsOn(TITLE_PAGE)) === 1 &&
    same(
      options.map((one) => [one.id, one.name]),
      OWNED_TITLES.map((one) => [String(one.id), one.label]),
    ) &&
    options.every((one) => one.lang === "ja") &&
    options.every((one) => !one.numbered) &&
    !(await page.evaluate<boolean>(`document.body.textContent.includes("Titles to choose from")`));
  results.titleWornMarked =
    same(
      options.filter((one) => one.current).map((one) => one.id),
      ["101"],
    ) && !(await exists("#title-pick-helper-text"));
  await popupClosed();
  results.titleAndNameWordsMarkedJapanese = await page.evaluate<boolean>(
    `(() => { const lang = (selector) => document.querySelector(selector)?.lang; return ["#title-pick", "#name-input", "#name-hint"].every((selector) => lang(selector) === "ja"); })()`,
  );

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

  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(titleOf(104).label)}`);
  await readTitlesAgain();
  await popupOpened();
  const sharedMarks = (await listed()).filter((one) => one.current).map((one) => one.id);
  idsShown.push(await idShownIn('#title-section, [role="listbox"]'));
  await popupClosed();
  const sharedNote = await textOf("#title-pick-helper-text");
  await fetch(`${HIROBA}/__profile?title=${encodeURIComponent(UNLISTED_TITLE)}`);
  await readTitlesAgain();
  await popupOpened();
  const unlistedMarks = (await listed()).filter((one) => one.current).length;
  await popupClosed();
  results.titleSharedNameNamed =
    same(sharedMarks, ["104", "105"]) &&
    sharedNote === "2 of your titles have this name, so the app cannot tell which one you wear." &&
    (await textOf("#title-pick-helper-text")) ===
      "Your current title is not in this list. It may be built from parts, which this version cannot read or change back." &&
    unlistedMarks === 0;
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

  // Settle the portrait fetches of earlier reads, so only a title write's are counted below.
  await goTo("overview");
  await waitForSeen(page, async () => (await exists("#my-don-image")) || undefined);
  const myDonsBeforeTitle = await myDonsSettled();
  await goTo("nameTitle");
  await inSection("title", "idle");

  await titlesRead();
  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  const readsBeforeTitle = await myPageHits();
  await pickTitle("最後", 108);
  await Bun.sleep(600);
  results.titlePickAloneWritesNothing =
    (await disabledOf("#title-save")) === false &&
    sameBesideLanePictures(await requestLog(), []) &&
    (await profilePosts()).length === 0;
  await page.evaluate(
    `(() => { window.noticesMounted = 0; new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) { if (node.nodeType === 1 && (node.matches("[data-outcome]") || node.querySelector("[data-outcome]") !== null)) window.noticesMounted += 1; } }).observe(document.body, { childList: true, subtree: true }); document.querySelector("#title-save").focus(); })()`,
  );
  await saveSection("title");
  await rereadDone(readsBeforeTitle);
  results.titleWriteKeepsTheFocusAndSaysNothing =
    (await page.evaluate<boolean>(
      `document.querySelector("#title-section")?.contains(document.activeElement) ?? false`,
    )) && (await page.evaluate<number>("window.noticesMounted")) === 0;
  const titleLog = await requestsSettled(TITLE_REQUESTS.length + TITLE_REREAD.length);
  const titleAfter = await profileNow();
  await waitFor(async () =>
    (await textOf("#profile-title")) === `Title: ${titleOf(108).label}` ? true : undefined,
  );
  results.titleSuccessSaysNothing =
    (await outcomeOf("title")) === null &&
    !(await exists("[data-outcome]")) &&
    !/Saved\.|Undone\.|now shows/.test(await text());
  await popupOpened();
  const wornAfterTitleWrite = (await listed()).filter((one) => one.current).map((one) => one.id);
  idsShown.push(await idShownIn('#title-section, [role="listbox"]'));
  await popupClosed();
  results.titleApplied =
    same(wornAfterTitleWrite, ["108"]) &&
    (await inputValueOf("#title-pick")) === titleOf(108).label &&
    (await textOf("#profile-title")) === `Title: ${titleOf(108).label}`;
  results.titleIdsNotShown = idsShown.length === 3 && idsShown.every((shown) => !shown);
  results.titleSentOnlyThePlannedRequests = runThen(titleLog, TITLE_REQUESTS, TITLE_REREAD);
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

  await goTo("overview");
  await waitForSeen(page, async () => (await exists("#my-don-image")) || undefined);
  const myDonAsked = await page.evaluate<boolean>(
    `window.abth.readPicture({ kind: "myDon" }).then((result) => result.ok)`,
  );
  results.titleWriteLeavesTheMyDon = myDonAsked && (await myDonsSettled()) === myDonsBeforeTitle;
  await goTo("nameTitle");
  await inSection("title", "idle");
  // Hiroba's title goes back to the start, and the page reads it.
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

  await fetch(`${HIROBA}/__profile-next-result?code=5&message=`);
  const titleRefused = await changeTitleInTheWindow("別の", 102, false);
  const titleRefusedText = (await textOf("#title-outcome")) ?? "";
  results.titleRefusedShowsCode =
    titleRefused === "notApplied" &&
    titleRefusedText.includes("Hiroba refused the change (code 5). Nothing changed.") &&
    titleRefusedText.includes("Hiroba says you do not own that title.") &&
    same(await profileNow(), profileAsStarted) &&
    (await disabledOf("#title-save")) === false;

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
}

export async function nickname(ctx: Ctx) {
  const { results } = ctx;
  const { page, text, textOf } = ctx.app;
  const { attribute, exists } = pageHelpers(page);
  const {
    bridgeName,
    changeNameInTheWindow,
    disabledOf,
    inputValueOf,
    nameSavable,
    outcomeOf,
    readTitlesAgain,
    saveSection,
    stepIn,
    typeName,
  } = nameTitleHelpers(ctx.app);

  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  results.nameFieldPrefilled =
    (await inputValueOf("#name-input")) === INITIAL_PROFILE.nickname &&
    (await disabledOf("#name-save")) === true &&
    (await disabledOf("#name-input")) === false &&
    sameBesideLanePictures(await requestLog(), []);
  await typeName("あたらしい");
  results.nameMaxLengthAndCounter =
    (await attribute("#name-input", "maxlength")) === "10" &&
    (await textOf("#name-counter")) === "5 / 10" &&
    (await disabledOf("#name-save")) === false;
  await typeName(` ${INITIAL_PROFILE.nickname} `);
  const sameNameHelp = await textOf("#name-hint");
  const sameNameShut = await disabledOf("#name-save");
  const unsendable = `あ${String.fromCharCode(1)}い`;
  const invalidNames: [string, string | null][] = [
    ["", en.t("name.siteWarning")],
    [
      "あ".repeat(11),
      "This app refused the change before sending it: the nickname is longer than Hiroba's form takes.",
    ],
    [
      unsendable,
      "This app refused the change before sending it: the nickname has a character that cannot be sent.",
    ],
  ];
  const invalidShown: [boolean | null, string | null][] = [];
  for (const [name] of invalidNames) {
    await typeName(name);
    invalidShown.push([await disabledOf("#name-save"), await textOf("#name-hint")]);
  }
  const sentBeforeTheBridge = await requestLog();
  const edgeRefused = await bridgeName(" あ");
  results.nameUnchangedSendsNothing =
    sameNameHelp === "That is your nickname already." &&
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

  await fetch(`${HIROBA}/__rename?state=closed`);
  await readTitlesAgain();
  const closedNote = await textOf("#name-closed");
  const closedShut = [await disabledOf("#name-input"), await disabledOf("#name-save")];
  await fetch(`${HIROBA}/__rename?state=odd`);
  await readTitlesAgain();
  const unknownOpen = await disabledOf("#name-input");
  const unknownNoted = (await exists("#name-closed")) || (await exists("#name-unknown"));
  await fetch(`${HIROBA}/__rename?state=open`);
  await readTitlesAgain();
  results.nameClosedShowsWhy =
    closedNote ===
      "Hiroba says nicknames can't be changed right now: 今はドンだーネームは変更できないドン！" &&
    same(closedShut, [true, true]) &&
    unknownOpen === false &&
    !unknownNoted &&
    !(await exists("#name-closed")) &&
    (await profileSaves()).length === 0;

  await resetLog();
  await fetch(`${HIROBA}/__profile-posts?reset=1`);
  await typeName("あたらしい");
  await nameSavable();
  await saveSection("name");
  const nameLog = await requestsSettled(NAME_REQUESTS.length);
  const nameAfter = await profileNow();
  results.nameApplied =
    same(nameAfter, { title: INITIAL_PROFILE.title, nickname: "あたらしい" }) &&
    (await inputValueOf("#name-input")) === "あたらしい" &&
    (await textOf("#title-plate h2")) === "あたらしい";
  results.nameSuccessSaysNothing =
    (await outcomeOf("name")) === null &&
    !(await exists("[data-outcome]")) &&
    !/Saved\.|Undone\.|now shows/.test(await text());
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

  // A change back made too soon is refused: the field keeps its text, and Save can go again.
  await fetch(`${HIROBA}/__rename-cooldown?on=1`);
  const tooSoon = await changeNameInTheWindow(INITIAL_PROFILE.nickname);
  const tooSoonText = (await textOf("#name-outcome")) ?? "";
  const keptByTheRefusal =
    (await inputValueOf("#name-input")) === INITIAL_PROFILE.nickname &&
    (await profileNow()).nickname === "あたらしい" &&
    (await disabledOf("#name-save")) === false;
  await fetch(`${HIROBA}/__rename-cooldown?on=0`);
  await saveSection("name");
  results.nameRefusedForAQuickChangeCanBeSavedAgain =
    tooSoon === "notApplied" &&
    tooSoonText.includes("Hiroba refused the change (code 1). Nothing changed.") &&
    tooSoonText.includes(`Hiroba said: ${COOLDOWN_MESSAGE}`) &&
    keptByTheRefusal &&
    (await outcomeOf("name")) === null &&
    same(await profileNow(), profileAsStarted);

  const filtered = await changeNameInTheWindow(REFUSED_NAME);
  const filteredText = (await textOf("#name-outcome")) ?? "";
  const fieldAfterRefusal = await inputValueOf("#name-input");
  await fetch(
    `${HIROBA}/__profile-next-result?code=1&message=${encodeURIComponent("<b>不適切</b>な名前")}`,
  );
  const markedUp = await changeNameInTheWindow("あたらしい");
  const markedUpText = (await textOf("#name-outcome")) ?? "";
  const markupInOutcome = await exists("#name-outcome b");
  results.nameRefusedShowsHirobaWordsAsText =
    filtered === "notApplied" &&
    filteredText.includes(`Hiroba said: ${FILTER_MESSAGE}`) &&
    fieldAfterRefusal === REFUSED_NAME &&
    markedUp === "notApplied" &&
    markedUpText.includes("Hiroba said: <b>不適切</b>な名前") &&
    !markupInOutcome &&
    same(await profileNow(), profileAsStarted);
  await typeName(INITIAL_PROFILE.nickname);

  const nameField = () =>
    page.evaluate<{
      value: string;
      counter: string | null;
      saveDisabled: boolean | null;
      helper: string | null;
    }>(
      `({ value: document.querySelector("#name-input").value, counter: document.querySelector("#name-counter")?.textContent ?? null, saveDisabled: document.querySelector("#name-save")?.disabled ?? null, helper: document.querySelector("#name-hint")?.textContent ?? null })`,
    );
  await page.evaluate(
    `(() => { const input = document.querySelector("#name-input"); input.focus(); input.select(); })()`,
  );
  await page.send("Input.imeSetComposition", { text: "あ", selectionStart: 1, selectionEnd: 1 });
  await Bun.sleep(200);
  const composing = await nameField();
  await page.send("Input.insertText", { text: "あたらしい" });
  await Bun.sleep(300);
  const committed = await nameField();
  results.nameCompositionNotJudgedUntilCommitted =
    composing.value === "あ" &&
    composing.helper === en.t("name.siteWarning") &&
    composing.counter === `${[...INITIAL_PROFILE.nickname].length} / 10` &&
    composing.saveDisabled === true &&
    committed.value === "あたらしい" &&
    committed.helper === en.t("name.siteWarning") &&
    committed.counter === "5 / 10" &&
    committed.saveDisabled === false;
  // An open composition beside a savable nickname: Enter is the IME's, and sends nothing.
  await page.send("Input.imeSetComposition", { text: "い", selectionStart: 1, selectionEnd: 1 });
  await Bun.sleep(200);
  const savesBeforeEnterInComposition = await hitsOn(SAVE);
  await page.evaluate(
    `document.querySelector("#name-input").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }))`,
  );
  await Bun.sleep(300);
  const enterInComposition = {
    saves: (await hitsOn(SAVE)) - savesBeforeEnterInComposition,
    saveDisabled: await disabledOf("#name-save"),
    step: await stepIn("name"),
  };
  await page.send("Input.insertText", { text: "い" });
  results.nameEnterWhileComposingSendsNothing =
    enterInComposition.saves === 0 &&
    enterInComposition.saveDisabled === true &&
    enterInComposition.step === "idle";
}

export async function nameTitleWrites(ctx: Ctx) {
  const { results, tokens } = ctx;
  const { click, goTo, page, textOf, until } = ctx.app;
  const { fabState, press } = pageHelpers(page);
  const {
    bridgeName,
    bridgeTitle,
    disabledOf,
    inSection,
    nameSavable,
    outcomeOf,
    pickTitle,
    readTitlesAgain,
    rereadDone,
    stepIn,
    typeName,
  } = nameTitleHelpers(ctx.app);

  await fetch(`${HIROBA}/__profile-hold-save?on=1`);
  const savesBeforeHeldName = await hitsOn(SAVE);
  await typeName("あたらしい");
  await nameSavable();
  await press("Enter");
  await waitFor(async () => ((await hitsOn(SAVE)) > savesBeforeHeldName ? true : undefined));
  results.nameEnterSavesAValidNickname = (await stepIn("name")) === "saving";
  await resetLog();
  const fabShutInNameWrite = (await fabState()).shut;
  const titleShutInNameWrite = [await disabledOf("#title-pick"), await disabledOf("#title-save")];
  await goTo("settings");
  const signOutShutInNameWrite =
    (await disabledOf("#sign-out")) === true && (await textOf("#account-who")) === "Signed in";
  await goTo("nameTitle");
  const busyTitle = await bridgeTitle();
  await click("#read-again");
  await Bun.sleep(300);
  const requestsWhileHeld = await requestLog();
  await fetch(`${HIROBA}/__profile-hold-save?on=0`);
  await inSection("name", "idle");
  results.noReadInsideAWriteHeldAtASave =
    fabShutInNameWrite &&
    same(titleShutInNameWrite, [true, true]) &&
    same(busyTitle, { kind: "busy" }) &&
    sameBesideLanePictures(requestsWhileHeld, []) &&
    (await outcomeOf("name")) === null &&
    (await profileNow()).nickname === "あたらしい";
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();
  await fetch(`${HIROBA}/__title-hold-precheck?on=1`);
  const prechecksBeforeHeldTitle = await hitsOn("/ajax/check_ip_title.php");
  const readsBeforeHeldTitle = await myPageHits();
  await pickTitle("別の", 102);
  await click("#title-save");
  await waitFor(async () =>
    (await hitsOn("/ajax/check_ip_title.php")) > prechecksBeforeHeldTitle ? true : undefined,
  );
  await resetLog();
  const fabShutInTitleWrite = (await fabState()).shut;
  const nameShutInTitleWrite = [await disabledOf("#name-input"), await disabledOf("#name-save")];
  await goTo("settings");
  const signOutShutInTitleWrite =
    (await disabledOf("#sign-out")) === true && (await textOf("#account-who")) === "Signed in";
  await goTo("nameTitle");
  const busyName = await bridgeName("あたらしい");
  await click("#read-again");
  await Bun.sleep(300);
  const requestsWhileTitleHeld = await requestLog();
  await fetch(`${HIROBA}/__title-hold-precheck?on=0`);
  await inSection("title", "idle");
  await rereadDone(readsBeforeHeldTitle);
  results.noReadInsideAWriteHeldAtAPrecheck =
    fabShutInTitleWrite &&
    same(nameShutInTitleWrite, [true, true]) &&
    same(busyName, { kind: "busy" }) &&
    sameBesideLanePictures(requestsWhileTitleHeld, []) &&
    (await outcomeOf("title")) === null &&
    (await profileNow()).title === titleOf(102).label;
  results.signOutShutWhileATitleOrNameWriteRuns = signOutShutInNameWrite && signOutShutInTitleWrite;
  await fetch(`${HIROBA}/__profile?reset=1`);
  await readTitlesAgain();

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
  results.sessionGoneAfterTitleSaveDropsTheSession = titleDropped;
  await fetch(`${HIROBA}/__profile?reset=1`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Last updated");
  await resetLog();

  const handedOut = (await (await fetch(`${HIROBA}/__tickets`)).json()) as string[];
  const windowNow = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.formTokensKeptOutOfDom =
    handedOut.length > 0 && !handedOut.some((ticket) => windowNow.includes(ticket));
}

export async function namePlate(ctx: Ctx) {
  // Reads the click log that portrait-preview sets up on the page.
  const { results } = ctx;
  const { currentPage, goTo, page, textOf } = ctx.app;
  const { attribute, boxOf, press, swipe, tooltipClosed, touchClicks } = pageHelpers(page);

  // The name plate is the button to the Nickname & title page, as the portrait is to Costume.
  const OPEN_NAME_TITLE = "Open the Nickname & title page";
  await goTo("overview");
  const plateBounds = await boxOf("#title-plate");
  const plateButtonBounds = await boxOf("#name-title-open");
  await tooltipClosed();
  await hoverOver(page, "#name-title-open");
  const plateTooltip = await waitFor(async () => (await textOf('[role="tooltip"]')) ?? undefined);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await tooltipClosed();
  results.namePlateIsTheNicknameAndTitleButton =
    (await page.evaluate<boolean>(
      `(() => { const button = document.querySelector("#name-title-open"); return button?.tagName === "BUTTON" && button.closest("#title-plate") !== null && button.querySelector("h2") === null && document.querySelector("#title-plate h2") !== null && !button.disabled; })()`,
    )) &&
    (await attribute("#name-title-open", "aria-label")) === OPEN_NAME_TITLE &&
    plateTooltip === OPEN_NAME_TITLE &&
    (["left", "top", "right", "bottom"] as const).every(
      (side) => Math.abs(plateButtonBounds[side] - plateBounds[side]) < 1,
    ) &&
    ((await textOf("#title-plate h2")) ?? "") !== "";
  const nameTitleOpenedBy = async (keys: () => Promise<unknown>) => {
    await page.evaluate(`document.querySelector("#name-title-open").focus()`);
    await keys();
    const opened = await waitFor(
      async () => (await currentPage()) === "nameTitle" || undefined,
      5_000,
    );
    await goTo("overview");
    return opened;
  };
  const plateAt = await middleOf(page, "#name-title-open");
  for (const type of ["mousePressed", "mouseReleased"]) {
    await page.send("Input.dispatchMouseEvent", {
      type,
      ...plateAt,
      button: "left",
      clickCount: 1,
    });
  }
  const openedByMouse = await waitFor(
    async () => (await currentPage()) === "nameTitle" || undefined,
    5_000,
  );
  const nameTitleShown = (await textOf("main h1")) === "Nickname & title";
  await goTo("overview");
  const openedByEnter = await nameTitleOpenedBy(() => press("Enter"));
  const openedBySpace = await nameTitleOpenedBy(async () => {
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...SPACE, text: " " });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...SPACE });
  });
  results.namePlateOpensNicknameAndTitleByClickAndKeys =
    openedByMouse && nameTitleShown && openedByEnter && openedBySpace;

  await page.evaluate("document.activeElement?.blur(); window.touchClicks.length = 0");
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  const plateHint = await waitFor(() =>
    page.evaluate<string | undefined>(
      `document.getElementById(document.querySelector("#name-title-open").getAttribute("aria-describedby") ?? "")?.textContent`,
    ),
  );
  const onPlate = await middleOf(page, "#name-title-open");
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [onPlate] });
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const plateTapClicked = await waitFor(
    async () => (await touchClicks()).includes("touch") || undefined,
  );
  await Bun.sleep(2 * LONG_PRESS_MS);
  const plateWentByTap = (await currentPage()) === "nameTitle";
  const readsBeforePlatePress = await myPageHits();
  await swipe(onPlate, { x: onPlate.x, y: onPlate.y + 100 }, () => Bun.sleep(2 * LONG_PRESS_MS));
  await Bun.sleep(500);
  const plateWentByMovedPress =
    (await currentPage()) === "nameTitle" || (await myPageHits()) !== readsBeforePlatePress;
  const clicksBeforePlateHold = await touchClicks();
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [onPlate] });
  const plateWentByLongPress = await waitFor(
    async () => (await currentPage()) === "nameTitle" || undefined,
    5_000,
  );
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await Bun.sleep(500);
  results.namePlateOpensNicknameAndTitleByLongPress =
    plateHint === "Long-press your name plate to open the Nickname & title page." &&
    plateTapClicked &&
    !plateWentByTap &&
    !plateWentByMovedPress &&
    plateWentByLongPress &&
    same(await touchClicks(), clicksBeforePlateHold) &&
    (await currentPage()) === "nameTitle" &&
    (await textOf("main h1")) === "Nickname & title";
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await goTo("overview");
}
