/** The Favourites page: its two cards, the sets drawer, the song picker and its search. */
import type { FavoritesState } from "../mock-favorites";
import { HIROBA, PHONE_TALL } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { requestLog, resetLog } from "./stand-in";

const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];
const FOLDER_PAGE = "GET /favorite_song_select.php";
const SONG_PAGE = "GET /portal_favorite_song_select.php";

const favoritesNow = async (query = "") =>
  (await (await fetch(`${HIROBA}/__favorites${query}`)).json()) as FavoritesState;

export const favoritesKeys = [
  "readAgainReadsBothEditors",
  "songsShownWithGenreAndLevels",
  "pickerShowsAllEightGenres",
  "pickerShowsAllEightGenresOnAPhone",
  "searchMarksTheNameShown",
  "searchMatchesAcrossScripts",
  "setBuiltAndApplied",
  "setAppliedWithNoMessage",
  "notStagedSaysSoAndSavesNothing",
  "favoriteSongPickedThenSaved",
  "favoriteSongDraftDroppedOnLeaving",
  "setsDrawerOpensBySwipe",
] as const;

export async function favorites(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { atSize, boxOf, exists, swipe, touchEmulated } = pageHelpers(page);
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
  const search = (query: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector("#song-picker-search"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(query)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const rowText = (songNo: string) => textOf(`#song-picker-row-${songNo}`);
  const boldIn = (songNo: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#song-picker-row-${songNo} b")].map((b) => b.textContent)`,
    );
  const genresInView = () =>
    page.evaluate<boolean>(
      `[1, 2, 3, 4, 5, 6, 7, 8].every((genre) => { const box = document.querySelector("#song-picker-genre-" + genre)?.getBoundingClientRect(); return box !== undefined && box.width > 0 && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; })`,
    );

  // Earlier sections opened this page and wrote the folder underneath it: read it again.
  await favoritesNow("?reset=1");
  await goTo("favorites");
  await stepIs("ready");
  await resetLog();
  await click("#read-again");
  await waitFor("both editors read", async () => {
    const log = await requestLog();
    return log.includes(FOLDER_PAGE) && log.includes(SONG_PAGE) ? true : undefined;
  });
  await stepIs("ready");
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

  await click("#favorites-sets");
  await shown("#favorites-drawer");
  await click("#favorites-item-new");
  await shown("#favorite-set-view");
  await click("#favorite-set-add");
  await shown("#song-picker-list");
  results.pickerShowsAllEightGenres = await genresInView();
  results.pickerShowsAllEightGenresOnAPhone = await atSize(
    PHONE_TALL.width,
    PHONE_TALL.height,
    genresInView,
  );

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
  await shown("#song-picker-row-1003");
  for (const songNo of ["1001", "1003"]) {
    await page.evaluate(`document.querySelector("#song-picker-row-${songNo} input").click()`);
  }
  await click("#song-picker-done");
  await gone("#song-picker");
  const setSongs = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#favorite-set-songs button[data-song-no]")].map((button) => button.dataset.songNo)`,
  );
  await resetLog();
  await click("#favorite-set-apply");
  await stepIs("ready");
  await shown("#favorite-folder-list");
  await Bun.sleep(500);
  results.setBuiltAndApplied =
    same(setSongs, ["1001", "1003"]) &&
    same((await favoritesNow()).folder.slice(0, 7), [
      "1001",
      "1003",
      null,
      null,
      null,
      null,
      null,
    ]) &&
    (await requestLog()).includes("POST /ajax/myfavorite_song.php");
  results.setAppliedWithNoMessage = !(await exists("#favorite-folder-outcome"));

  await favoritesNow("?emptyClears=0");
  await click("#favorites-sets");
  await shown("#favorites-item-folder");
  await click("#favorites-item-folder");
  await gone("#favorites-drawer");
  await click("#favorite-folder-save-as-set");
  await shown("#favorite-set-view");
  await page.evaluate(
    `document.querySelector('#favorite-set-songs button[data-song-no="1003"]').click()`,
  );
  await resetLog();
  await click("#favorite-set-apply");
  await shown("#favorite-folder-outcome");
  results.notStagedSaysSoAndSavesNothing =
    (await textOf("#favorite-folder-outcome"))?.includes("didn't take every song") === true &&
    !(await requestLog()).includes("POST /ajax/myfavorite_song.php") &&
    same((await favoritesNow()).folder.slice(0, 3), ["1001", "1003", null]);
  await favoritesNow("?emptyClears=1");

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

  await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
    await touchEmulated(true);
    try {
      await Bun.sleep(500);
      const page = await boxOf("main");
      const y = page.top + 300;
      await swipe({ x: PHONE_TALL.width - 60, y }, { x: PHONE_TALL.width - 200, y: y + 10 });
      const opened = await waitFor(
        "sets drawer open",
        async () => (await exists("#favorites-drawer")) || undefined,
      );
      await Bun.sleep(500);
      await swipe({ x: PHONE_TALL.width - 200, y }, { x: PHONE_TALL.width - 40, y: y + 10 });
      await gone("#favorites-drawer");
      results.setsDrawerOpensBySwipe = opened;
    } finally {
      await touchEmulated(false);
    }
  });
  await favoritesNow("?reset=1");
}
