/** The Favourites page: its two cards, the sets drawer, the song picker, its filters and search. */
import { type FavoritesState, LOCKED_SONG } from "../mock-favorites";
import { HIROBA, PHONE_TALL } from "./config";
import type { Ctx } from "./context";
import { middleOf, type Point, pageHelpers, same, waitFor } from "./harness";
import { hitsOn, myPageHits, requestLog, resetLog } from "./stand-in";

const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];
const FOLDER_PAGE = "GET /favorite_song_select.php";
const SONG_PAGE = "GET /portal_favorite_song_select.php";
const FOLDER_SAVE = "POST /ajax/myfavorite_song.php";
/** The stand-in's song with a title too long for any row. */
const LONG_TITLED = "1038";
/** The stand-in's songs Hiroba's own picker offers, the newest first. */
const EVERY_SONG = Array.from({ length: 38 }, (_, index) => String(1038 - index)).filter(
  (songNo) => songNo !== LOCKED_SONG,
);
/** A song with an inner chart, whose 裏 entry the 大好きな曲 picker lists as a row of its own. */
const WITH_INNER = "1005";
const INNER_TEN = ["1036", "1027", "1021", "1017", "1008", "1005"];
const EXTREME_OR_INNER_TEN = ["1036", "1027", "1021", "1019", "1017", "1008", "1005"];
const FILTER_CHIPS = ["#song-picker-genre", "#song-picker-difficulty", "#song-picker-level"];

const favoritesNow = async (query = "") =>
  (await (await fetch(`${HIROBA}/__favorites${query}`)).json()) as FavoritesState;

export const favoritesKeys = [
  "readAgainReadsBothEditors",
  "songsShownWithGenreAndLevels",
  "levelsStackBehindTheShownDifficulty",
  "levelsSpreadOnAClickAndFoldBack",
  "badgesOpenNoDetails",
  "shownDifficultyFromSettings",
  "folderSongOpensItsDetails",
  "favoriteSongOpensItsDetails",
  "setsSwipeWaitsForTheDetails",
  "newSetAsksForItsName",
  "pickerShowsItsFilters",
  "pickerShowsItsFiltersOnAPhone",
  "pickerOpensOnEverySong",
  "songShowsABarPerGenre",
  "pickerShowsTheFilteredDifficultyFirst",
  "pickerFiltersByChartAndStars",
  "pickerStarsAloneTakeAnyChart",
  "pickerFiltersAddUp",
  "pickerMenuShutByItsChip",
  "pickerFiltersCleared",
  "searchMarksTheNameShown",
  "searchMatchesAcrossScripts",
  "longNameScrolls",
  "songsMovedByTheirHandle",
  "setEditsWaitForSave",
  "setShownBeforeEditing",
  "setSongOpensItsDetailsOnlyWhenShown",
  "setBuiltAndApplied",
  "setAppliedWithNoMessage",
  "folderShowsTheSetInUse",
  "notStagedSaysSoAndSavesNothing",
  "folderSavedIntoASet",
  "setsMovedByTheirHandle",
  "setRenamedFromItsMenu",
  "setDeletedFromItsMenu",
  "favoriteSongPickedThenSaved",
  "pickerListLeftAloneByAReadAgain",
  "pickerListReadAsAPickerOpens",
  "favoritePickerOffersWhatHirobaOffers",
  "favoritePickerFiltersEachSide",
  "innerRowWearsItsColour",
  "innerEntrySavedAndShown",
  "favoriteSongDraftDroppedOnLeaving",
  "songsMovedByALongPress",
  "setsDrawerOpensBySwipe",
  "setsButtonHiddenOnTouch",
  "setOffersItsActionsOnALongPress",
] as const;

export async function favorites(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { atSize, boxOf, exists, fabState, press, swipe, touchEmulated } = pageHelpers(page);
  const stepIs = (step: string) =>
    waitFor(`favourites ${step}`, async () =>
      (await page.evaluate<string | null>(
        `document.querySelector("#favorites-page")?.dataset.step ?? null`,
      )) === step
        ? true
        : undefined,
    );
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const typeInto = (selector: string, text: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const search = (query: string) => typeInto("#song-picker-search", query);
  const rowText = (songNo: string) => textOf(`#song-picker-row-${songNo}`);
  const placesIn = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${selector} [data-difficulty]`)})].map((badge) => badge.dataset.place)`,
    );
  const difficultiesIn = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${selector} [data-difficulty]`)})].map((badge) => badge.dataset.difficulty)`,
    );
  const stackOpen = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(`${selector} .level-stack`)})?.getAttribute("aria-expanded") ?? null`,
    );
  const barsOf = (songNos: readonly string[]) =>
    page.evaluate<number[]>(
      `${JSON.stringify(songNos)}.map((songNo) => document.querySelectorAll("#song-picker-row-" + songNo + " .song-bar").length)`,
    );
  const showDifficulty = async (difficulty: string) => {
    await goTo("settings");
    await shown(`#shown-difficulty-${difficulty}`);
    await click(`#shown-difficulty-${difficulty}`);
    await goTo("favorites");
    await stepIs("ready");
    await shown("#favorite-folder-slot-1 [data-difficulty]");
  };
  const boldIn = (songNo: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#song-picker-row-${songNo} b")].map((b) => b.textContent)`,
    );
  const filtersInView = () =>
    page.evaluate<boolean>(
      `${JSON.stringify(FILTER_CHIPS)}.every((selector) => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box !== undefined && box.width > 0 && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; })`,
    );
  const chosenFilters = () =>
    page.evaluate<number>(`document.querySelectorAll("#song-picker .MuiChip-filled").length`);
  const choose = async (filter: string, value: string) => {
    await click(`#song-picker-${filter}`);
    await shown(`#song-picker-${filter}-${value}`);
    await click(`#song-picker-${filter}-${value}`);
    await gone(`#song-picker-${filter}-menu`);
  };
  const pickerSongs = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#song-picker-list > li")].map((row) => row.dataset.songNo)`,
    );
  const soon = (label: string, probe: () => Promise<boolean>) =>
    waitFor(label, async () => (await probe()) || undefined, 5_000).catch(() => false);
  const listed = (songs: readonly string[]) =>
    soon(`picker lists ${songs.length} songs`, async () => same(await pickerSongs(), songs));
  const keysIn = (list: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#${list} > li")].map((row) => row.dataset.key)`,
    );
  const keptSongs = () =>
    page.evaluate<string[] | null>(
      `JSON.parse(localStorage.getItem("abth.favoriteSets") ?? "null")?.sets?.[0]?.songs ?? null`,
    );
  const setNames = () =>
    page.evaluate<(string | null)[]>(
      `[...document.querySelectorAll("#favorites-set-list > li")].map((row) => row.querySelector(".MuiListItemText-primary")?.textContent ?? null)`,
    );
  const editing = () =>
    page.evaluate<string | null>(
      `document.querySelector("#favorite-set-view")?.dataset.editing ?? null`,
    );
  // dnd-kit follows the mouse once it has gone a few pixels with the button down.
  const dragByMouse = async (from: Point, to: Point) => {
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...from });
    await page.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...from,
      button: "left",
      clickCount: 1,
    });
    for (let step = 1; step <= 10; step++) {
      await page.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: from.x + ((to.x - from.x) * step) / 10,
        y: from.y + ((to.y - from.y) * step) / 10,
        button: "left",
        buttons: 1,
      });
      await Bun.sleep(30);
    }
    await page.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...to,
      button: "left",
      clickCount: 1,
    });
    await Bun.sleep(500);
  };
  // A real press, which lands on whatever covers the element, as a menu's backdrop does.
  const mouseClick = async (selector: string, button: "left" | "right") => {
    const at = await middleOf(page, selector);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
    await page.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...at,
      button,
      clickCount: 1,
    });
    await page.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...at,
      button,
      clickCount: 1,
    });
  };
  const rightClick = (selector: string) => mouseClick(selector, "right");
  const holdFinger = async (at: Point, moveTo?: Point) => {
    await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
    await Bun.sleep(500);
    if (moveTo !== undefined) {
      for (let step = 1; step <= 10; step++) {
        await page.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: at.x, y: at.y + ((moveTo.y - at.y) * step) / 10 }],
        });
        await Bun.sleep(30);
      }
    }
    await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await Bun.sleep(500);
  };
  const openDrawer = async () => {
    await click("#favorites-sets");
    await shown("#favorites-drawer");
    await Bun.sleep(300);
  };
  const nameAndSave = async (name?: string) => {
    await shown("#favorite-set-name-save");
    if (name !== undefined) {
      await typeInto("#favorite-set-name", name);
    }
    await click("#favorite-set-name-save");
    await gone("#favorite-set-name-dialog");
  };

  const readBothEditorsAgain = async () => {
    await resetLog();
    await click("#read-again");
    await waitFor("both editors read", async () => {
      const log = await requestLog();
      return log.includes(FOLDER_PAGE) && log.includes(SONG_PAGE) ? true : undefined;
    });
    await stepIs("ready");
  };

  // Earlier sections opened this page and wrote the folder underneath it: read it again.
  await favoritesNow("?reset=1");
  await goTo("favorites");
  await stepIs("ready");
  await readBothEditorsAgain();
  const entryLog = await requestLog();
  results.readAgainReadsBothEditors =
    same(
      entryLog.filter((line) => line === FOLDER_PAGE || line === SONG_PAGE),
      [FOLDER_PAGE, SONG_PAGE],
    ) && (await exists("#favorite-song-row"));

  await shown("#favorite-folder-slot-1 [data-difficulty]");
  const folderRows = await page.evaluate<number>(
    `document.querySelectorAll("#favorite-folder-list > li").length`,
  );
  const badges = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#favorite-folder-slot-1 [data-difficulty]")].map((badge) => badge.getAttribute("aria-label"))`,
  );
  results.songsShownWithGenreAndLevels =
    folderRows === START_FOLDER.length &&
    (await textOf("#favorite-song-row"))?.includes("Wings of Light") === true &&
    same(badges, ["Easy ★2", "Normal ★3", "Hard ★5", "Extreme ★7"]);

  const SLOT_1 = "#favorite-folder-slot-1";
  results.levelsStackBehindTheShownDifficulty =
    same(await placesIn(SLOT_1), ["before", "before", "before", "front"]) &&
    (await stackOpen(SLOT_1)) === "false";
  await click(`${SLOT_1} .level-stack`);
  const spread = await stackOpen(SLOT_1);
  await click(`${SLOT_1} .level-stack`);
  results.levelsSpreadOnAClickAndFoldBack =
    spread === "true" && (await stackOpen(SLOT_1)) === "false";
  results.badgesOpenNoDetails =
    (await exists(`${SLOT_1} .song-open`)) &&
    !(await exists(`${SLOT_1} .song-open .level-stack`)) &&
    !(await exists("#song-details"));

  await showDifficulty("hard");
  const hardInFront = await placesIn(SLOT_1);
  await showDifficulty("oni");
  results.shownDifficultyFromSettings =
    same(hardInFront, ["before", "before", "front", "after"]) &&
    same(await placesIn(SLOT_1), ["before", "before", "before", "front"]);

  const detailsTitleOf = async (row: string) => {
    const name = await textOf(`${row} .song-name`);
    await click(`${row} .song-open`);
    await shown("#song-details-title");
    const title = await textOf("#song-details-title");
    await press("Escape");
    await gone("#song-details");
    return name !== null && title === name;
  };
  results.folderSongOpensItsDetails = await detailsTitleOf(SLOT_1);
  results.favoriteSongOpensItsDetails = await detailsTitleOf("#favorite-song-row");
  results.setsSwipeWaitsForTheDetails = await atSize(
    PHONE_TALL.width,
    PHONE_TALL.height,
    async () => {
      await touchEmulated(true);
      try {
        await click(`${SLOT_1} .song-open`);
        await shown("#song-details-title");
        const y = PHONE_TALL.height / 2;
        await swipe({ x: PHONE_TALL.width - 60, y }, { x: PHONE_TALL.width - 200, y: y + 10 });
        await Bun.sleep(800);
        const drawerUnder = await exists("#favorites-drawer");
        await press("Escape");
        await gone("#song-details");
        return !drawerUnder;
      } finally {
        await touchEmulated(false);
      }
    },
  );

  await openDrawer();
  await click("#favorites-item-new");
  await shown("#favorite-set-name");
  const offeredName = await page.evaluate<string>(
    `document.querySelector("#favorite-set-name").value`,
  );
  await nameAndSave();
  await shown("#favorite-set-add");
  results.newSetAsksForItsName =
    offeredName === "Set 1" &&
    (await textOf("#favorites-name")) === "Set 1" &&
    (await editing()) === "true";
  await click("#favorite-set-add");
  await shown("#song-picker-list");
  results.pickerShowsItsFilters = await filtersInView();
  results.pickerShowsItsFiltersOnAPhone = await atSize(
    PHONE_TALL.width,
    PHONE_TALL.height,
    filtersInView,
  );
  results.pickerOpensOnEverySong = (await chosenFilters()) === 0 && (await listed(EVERY_SONG));
  results.songShowsABarPerGenre = same(await barsOf(["1012", "1001"]), [2, 1]);

  await choose("difficulty", "hard");
  results.pickerShowsTheFilteredDifficultyFirst = same(await placesIn("#song-picker-row-1019"), [
    "before",
    "before",
    "front",
    "after",
  ]);

  await choose("difficulty", "oni");
  await choose("level", "10");
  const extremeTen = await listed(["1019"]);
  await choose("difficulty", "ura");
  results.pickerFiltersByChartAndStars =
    extremeTen &&
    (await listed(INNER_TEN)) &&
    (await textOf("#song-picker-difficulty")) === "Extreme (Inner)" &&
    (await textOf("#song-picker-level")) === "★10";
  await choose("difficulty", "all");
  results.pickerStarsAloneTakeAnyChart = await listed(EXTREME_OR_INNER_TEN);

  await choose("genre", "4");
  const vocaloidTen = await listed(["1021", "1019", "1017"]);
  await search("signal");
  results.pickerFiltersAddUp = vocaloidTen && (await listed(["1019"]));
  await search("");

  await click("#song-picker-genre");
  await shown("#song-picker-genre-menu");
  await mouseClick("#song-picker-genre", "left");
  results.pickerMenuShutByItsChip = await soon(
    "genre menu shut",
    async () => !(await exists("#song-picker-genre-menu")),
  );
  await mouseClick("#song-picker-level .MuiChip-deleteIcon", "left");
  await choose("genre", "all");
  results.pickerFiltersCleared = (await chosenFilters()) === 0 && (await listed(EVERY_SONG));

  await search("magic");
  await shown("#song-picker-row-1011");
  results.searchMarksTheNameShown =
    (await rowText("1011"))?.startsWith("The Magical Girl Never Sleeps") === true &&
    same(await boldIn("1011"), ["Magic"]);

  await search("會入睡");
  await shown("#song-picker-row-1011");
  results.searchMatchesAcrossScripts =
    (await rowText("1011"))?.includes("(魔法少女不会入睡)") === true &&
    same(await boldIn("1011"), ["会入睡"]);

  await search("");
  await shown(`#song-picker-row-${LONG_TITLED}`);
  for (const songNo of ["1001", "1003", LONG_TITLED]) {
    await page.evaluate(`document.querySelector("#song-picker-row-${songNo} input").click()`);
  }
  await click("#song-picker-done");
  await gone("#song-picker");
  await shown(`#favorite-set-song-${LONG_TITLED}`);
  await Bun.sleep(500);
  results.longNameScrolls = await exists(`#favorite-set-song-${LONG_TITLED} .scrolling`);
  const noDetailsWhileEditing = !(await exists("#favorite-set-songs .song-open"));

  const pickedOrder = await keysIn("favorite-set-songs");
  await dragByMouse(
    await middleOf(page, '#favorite-set-songs > li[data-key="1001"] .drag-handle'),
    await middleOf(page, '#favorite-set-songs > li[data-key="1003"] .drag-handle'),
  );
  const movedOrder = await keysIn("favorite-set-songs");
  results.songsMovedByTheirHandle =
    same(pickedOrder, ["1001", "1003", LONG_TITLED]) &&
    same(movedOrder, ["1003", "1001", LONG_TITLED]);

  const keptBeforeSave = await keptSongs();
  await click("#favorite-set-save");
  await shown("#favorite-set-apply");
  results.setEditsWaitForSave =
    same(keptBeforeSave, []) && same(await keptSongs(), ["1003", "1001", LONG_TITLED]);
  results.setShownBeforeEditing =
    (await editing()) === "false" &&
    (await exists("#favorite-set-edit")) &&
    !(await exists("#favorite-set-songs .drag-handle")) &&
    !(await exists("#favorite-set-songs button[data-song-no]"));
  results.setSongOpensItsDetailsOnlyWhenShown =
    noDetailsWhileEditing && (await detailsTitleOf(`#favorite-set-song-${LONG_TITLED}`));

  await resetLog();
  await click("#favorite-set-apply");
  await stepIs("ready");
  await shown("#favorite-folder-list");
  await Bun.sleep(500);
  results.setBuiltAndApplied =
    same((await favoritesNow()).folder.slice(0, 4), ["1003", "1001", LONG_TITLED, null]) &&
    (await requestLog()).includes(FOLDER_SAVE) &&
    (await textOf("#favorites-name")) === "Current favourites";
  results.setAppliedWithNoMessage = !(await exists("#favorite-folder-outcome"));
  results.folderShowsTheSetInUse =
    (await textOf("#favorite-folder-set")) === "In use: Set 1" &&
    !(await exists("#favorite-folder-save-as-set"));

  await favoritesNow("?emptyClears=0");
  await openDrawer();
  await click("#favorites-item-set-0");
  await shown("#favorite-set-edit");
  await click("#favorite-set-edit");
  await shown(`#favorite-set-songs button[data-song-no="${LONG_TITLED}"]`);
  await page.evaluate(
    `document.querySelector('#favorite-set-songs button[data-song-no="${LONG_TITLED}"]').click()`,
  );
  await click("#favorite-set-save");
  await shown("#favorite-set-apply");
  await resetLog();
  await click("#favorite-set-apply");
  await shown("#favorite-folder-outcome");
  results.notStagedSaysSoAndSavesNothing =
    (await textOf("#favorite-folder-outcome"))?.includes("didn't take every song") === true &&
    !(await requestLog()).includes(FOLDER_SAVE) &&
    same((await favoritesNow()).folder.slice(0, 3), ["1003", "1001", LONG_TITLED]);
  await favoritesNow("?emptyClears=1");

  await click("#favorite-folder-save-to-set");
  await shown("#favorite-folder-save-to-set-0");
  await click("#favorite-folder-save-to-set-0");
  await shown("#favorite-folder-replace-confirm");
  await click("#favorite-folder-replace-confirm");
  await shown("#favorite-folder-set");
  results.folderSavedIntoASet = (await textOf("#favorite-folder-set")) === "In use: Set 1";

  await openDrawer();
  await click("#favorites-item-new");
  await nameAndSave();
  await shown("#favorite-set-empty");
  await openDrawer();
  const setsBefore = await setNames();
  await dragByMouse(
    await middleOf(page, "#favorites-set-list > li:nth-child(2) .drag-handle"),
    await middleOf(page, "#favorites-set-list > li:nth-child(1) .drag-handle"),
  );
  const setsAfter = await setNames();
  results.setsMovedByTheirHandle =
    same(setsBefore, ["Set 1", "Set 2"]) && same(setsAfter, ["Set 2", "Set 1"]);

  await rightClick("#favorites-item-set-1");
  await shown("#favorite-set-menu-rename");
  await click("#favorite-set-menu-rename");
  await nameAndSave("Practice");
  results.setRenamedFromItsMenu = same(await setNames(), ["Set 2", "Practice"]);

  // The dialog just shut gives focus back as it goes: a menu opened meanwhile would lose it.
  await Bun.sleep(500);
  await rightClick("#favorites-item-set-0");
  await shown("#favorite-set-menu-delete");
  await click("#favorite-set-menu-delete");
  await shown("#favorite-set-delete-confirm");
  await click("#favorite-set-delete-confirm");
  await gone("#favorite-set-delete-dialog");
  results.setDeletedFromItsMenu = same(await setNames(), ["Practice"]);
  await click("#favorites-item-folder");
  await gone("#favorites-drawer");

  await click("#favorite-song-change");
  await shown("#song-picker-row-1002 button");
  await page.evaluate(`document.querySelector("#song-picker-row-1002 button").click()`);
  await gone("#song-picker");
  await shown("#favorite-song-save");
  await click("#favorite-song-save");
  await gone("#favorite-song-saving");
  await gone("#favorite-song-save");
  results.favoriteSongPickedThenSaved =
    (await favoritesNow()).favoriteSong === "1002" && !(await exists("#favorite-song-outcome"));

  await click("#favorite-song-change");
  await shown("#song-picker-row-1004 button");
  await page.evaluate(`document.querySelector("#song-picker-row-1004 button").click()`);
  await shown("#favorite-song-save");
  await goTo("overview");
  await goTo("favorites");
  await stepIs("ready");
  results.favoriteSongDraftDroppedOnLeaving =
    !(await exists("#favorite-song-save")) && (await favoritesNow()).favoriteSong === "1002";

  // The pickers' list is read as a picker opens: a read again, on any page, only lets it go stale.
  const pickerReads = () => hitsOn("/form_data.php");
  const readsBeforeReadAgain = await pickerReads();
  await goTo("overview");
  const myPageBefore = await myPageHits();
  await click("#read-again");
  await waitFor("my page read again", async () =>
    (await myPageHits()) > myPageBefore && same(await fabState(), { shut: false, spinning: false })
      ? true
      : undefined,
  );
  await goTo("favorites");
  await stepIs("ready");
  await readBothEditorsAgain();
  await Bun.sleep(1000);
  const readsBeforeOpen = await pickerReads();
  results.pickerListLeftAloneByAReadAgain = readsBeforeOpen === readsBeforeReadAgain;
  await click("#favorite-song-change");
  await shown(`#song-picker-row-${WITH_INNER}-ura button`);
  const readAsItOpened = await waitFor(
    "the pickers' list read as the picker opened",
    async () => ((await pickerReads()) > readsBeforeOpen ? true : undefined),
    5_000,
  ).catch(() => false);
  results.favoritePickerOffersWhatHirobaOffers =
    !(await exists(`#song-picker-row-${LOCKED_SONG}`)) &&
    (await exists(`#song-picker-row-${WITH_INNER} button`)) &&
    same(await difficultiesIn(`#song-picker-row-${WITH_INNER}`), [
      "easy",
      "normal",
      "hard",
      "oni",
    ]) &&
    same(await difficultiesIn(`#song-picker-row-${WITH_INNER}-ura`), ["ura"]) &&
    (await textOf(`#song-picker-row-${WITH_INNER}-ura .song-artists`))?.includes("Inner chart") !==
      true &&
    !(await exists("#song-picker-row-1001-ura"));
  results.innerRowWearsItsColour = await page.evaluate<boolean>(
    `(() => { const inner = document.querySelector("#song-picker-row-${WITH_INNER}-ura"); const front = document.querySelector("#song-picker-row-${WITH_INNER}"); const bg = inner ? getComputedStyle(inner).backgroundColor : ""; return inner?.classList.contains("picker-row-ura") === true && front?.classList.contains("picker-row-ura") !== true && bg !== "" && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)"; })()`,
  );
  await choose("difficulty", "ura");
  const innerOnly =
    !(await exists(`#song-picker-row-${WITH_INNER} button`)) &&
    (await exists(`#song-picker-row-${WITH_INNER}-ura button`));
  await choose("difficulty", "oni");
  const frontOnly =
    (await exists(`#song-picker-row-${WITH_INNER} button`)) &&
    !(await exists(`#song-picker-row-${WITH_INNER}-ura`));
  await choose("difficulty", "all");
  results.favoritePickerFiltersEachSide = innerOnly && frontOnly;
  await shown(`#song-picker-row-${WITH_INNER}-ura button`);
  await page.evaluate(
    `document.querySelector("#song-picker-row-${WITH_INNER}-ura button").click()`,
  );
  await gone("#song-picker");
  await shown("#favorite-song-save");
  await click("#favorite-song-save");
  await gone("#favorite-song-saving");
  await gone("#favorite-song-save");
  const innerSaved = await favoritesNow();
  results.innerEntrySavedAndShown =
    innerSaved.favoriteSong === WITH_INNER &&
    innerSaved.favoriteSongUra &&
    (await textOf("#favorite-song-row .song-artists"))?.startsWith("Inner chart") === true &&
    !(await exists("#favorite-song-outcome"));
  const readsBeforeReopen = await pickerReads();
  await click("#favorite-song-change");
  await shown("#song-picker-list");
  await Bun.sleep(1000);
  const readOnReopen = (await pickerReads()) !== readsBeforeReopen;
  await press("Escape");
  await gone("#song-picker");
  await Bun.sleep(500);
  results.pickerListReadAsAPickerOpens = readAsItOpened && !readOnReopen;

  await openDrawer();
  await click("#favorites-item-set-0");
  await gone("#favorites-drawer");
  await click("#favorite-set-edit");
  await shown("#favorite-set-songs");
  await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
    const buttonWithoutTouch = await exists("#favorites-sets");
    await touchEmulated(true);
    try {
      await Bun.sleep(500);
      results.setsButtonHiddenOnTouch = buttonWithoutTouch && !(await exists("#favorites-sets"));
      const before = await keysIn("favorite-set-songs");
      await holdFinger(
        await middleOf(page, "#favorite-set-songs > li:nth-child(1)"),
        await middleOf(page, "#favorite-set-songs > li:nth-child(2)"),
      );
      results.songsMovedByALongPress =
        before.length === 3 &&
        same(await keysIn("favorite-set-songs"), [before[1], before[0], before[2]]);

      const main = await boxOf("main");
      const y = main.top + 300;
      await swipe({ x: PHONE_TALL.width - 60, y }, { x: PHONE_TALL.width - 200, y: y + 10 });
      const opened = await waitFor(
        "sets drawer open",
        async () => (await exists("#favorites-drawer")) || undefined,
      );
      await Bun.sleep(500);
      await holdFinger(await middleOf(page, "#favorites-item-set-0"));
      results.setOffersItsActionsOnALongPress =
        (await exists("#favorite-set-actions-rename")) &&
        (await exists("#favorite-set-actions-delete"));
      await press("Escape");
      await gone("#favorite-set-actions");
      await swipe({ x: PHONE_TALL.width - 200, y }, { x: PHONE_TALL.width - 40, y: y + 10 });
      await gone("#favorites-drawer");
      results.setsDrawerOpensBySwipe = opened;
    } finally {
      await touchEmulated(false);
    }
  });
  await favoritesNow("?reset=1");
}
