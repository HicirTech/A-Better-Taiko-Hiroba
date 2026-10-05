/** The favourites' verbs through the bridge: what each sends Hiroba, and how a folder is staged. */
import type { FavoritesState } from "../mock-favorites";
import { HIROBA } from "./config";
import type { Ctx } from "./context";
import { same } from "./harness";
import { requestLog, resetLog } from "./stand-in";

const FOLDER_PAGE = "GET /favorite_song_select.php";
const SONG_PAGE = "GET /portal_favorite_song_select.php";
const FOLDER_SAVE = "POST /ajax/myfavorite_song.php";
const SONG_SAVE = "POST /ajax/mypage_song.php";
const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];

type Outcome = { kind: string; after?: { slots?: (string | null)[]; songNo?: string | null } };

const favoritesNow = async (query = "") =>
  (await (await fetch(`${HIROBA}/__favorites${query}`)).json()) as FavoritesState;
const slotsOf = (songs: string[]) => Array.from({ length: 30 }, (_, index) => songs[index] ?? null);
const stagingGets = (log: string[]) => log.filter((line) => line === FOLDER_PAGE).length - 2;

export const favoriteWritesKeys = [
  "favoritesOpenReadsBothEditors",
  "folderWriteStagesOnlyTheChangedSlots",
  "folderWriteEmptiesTheSlotsLeftOver",
  "folderStagedAgainWhenInitStagesNothing",
  "folderNotSavedWhenEmptiesAreIgnored",
  "favoriteSongSetAndCleared",
  "songCatalogueRead",
  "chineseNamesRead",
] as const;

export async function favoriteWrites(ctx: Ctx) {
  const { results } = ctx;
  const { page } = ctx.app;
  const call = <T>(script: string) => page.evaluate<T>(script);
  const changeFolder = (expected: string[], target: string[]) =>
    call<Outcome>(
      `window.abth.changeFolder(${JSON.stringify({ expected: { slots: slotsOf(expected) }, target })})`,
    );

  await favoritesNow("?reset=1");
  await resetLog();
  const opened = await call<{
    ok: boolean;
    value?: {
      folder: { state: { slots: (string | null)[] } };
      song: { state: { songNo: string } };
    };
  }>("window.abth.openFavorites()");
  results.favoritesOpenReadsBothEditors =
    opened.ok &&
    same(opened.value?.folder.state.slots, slotsOf(START_FOLDER)) &&
    opened.value?.song.state.songNo === "1008" &&
    same(await requestLog(), [FOLDER_PAGE, SONG_PAGE]);

  await resetLog();
  const added = await changeFolder(START_FOLDER, [...START_FOLDER, "1002"]);
  const addedLog = await requestLog();
  results.folderWriteStagesOnlyTheChangedSlots =
    added.kind === "applied" &&
    same((await favoritesNow()).folder, slotsOf([...START_FOLDER, "1002"])) &&
    same(addedLog, [FOLDER_PAGE, FOLDER_PAGE, FOLDER_SAVE, FOLDER_PAGE]);

  await resetLog();
  const shortened = await changeFolder([...START_FOLDER, "1002"], ["1002", "1001"]);
  results.folderWriteEmptiesTheSlotsLeftOver =
    shortened.kind === "applied" &&
    same((await favoritesNow()).folder, slotsOf(["1002", "1001"])) &&
    stagingGets(await requestLog()) === 7;

  await favoritesNow("?reset=1&initStages=0");
  await resetLog();
  const restaged = await changeFolder(START_FOLDER, [...START_FOLDER, "1002"]);
  results.folderStagedAgainWhenInitStagesNothing =
    restaged.kind === "applied" &&
    same((await favoritesNow()).folder, slotsOf([...START_FOLDER, "1002"])) &&
    stagingGets(await requestLog()) === 7;

  await favoritesNow("?reset=1&emptyClears=0");
  await resetLog();
  const unstaged = await changeFolder(START_FOLDER, ["1001", "1008"]);
  results.folderNotSavedWhenEmptiesAreIgnored =
    unstaged.kind === "notStaged" &&
    same((await favoritesNow()).folder, slotsOf(START_FOLDER)) &&
    !(await requestLog()).includes(FOLDER_SAVE);

  await favoritesNow("?reset=1");
  await resetLog();
  const set = await call<Outcome>(
    `window.abth.changeFavoriteSong(${JSON.stringify({ expected: { songNo: "1008", ura: false }, target: { songNo: "1001", ura: false } })})`,
  );
  const cleared = await call<Outcome>(
    `window.abth.changeFavoriteSong(${JSON.stringify({ expected: { songNo: "1001", ura: false }, target: { songNo: null, ura: false } })})`,
  );
  results.favoriteSongSetAndCleared =
    set.kind === "applied" &&
    cleared.kind === "applied" &&
    (await favoritesNow()).favoriteSong === null &&
    same(await requestLog(), [SONG_PAGE, SONG_SAVE, SONG_PAGE, SONG_PAGE, SONG_SAVE, SONG_PAGE]);
  await favoritesNow("?reset=1");

  const whole = await call<{ ok: boolean; value?: { songs: unknown[]; removed: string[] } }>(
    "window.abth.readSongCatalogue(null)",
  );
  const since = await call<{
    ok: boolean;
    value?: { songs: { songNo: string }[]; removed: string[] };
  }>("window.abth.readSongCatalogue(1)");
  results.songCatalogueRead =
    whole.ok &&
    whole.value?.songs.length === 38 &&
    same(whole.value?.removed, ["1039"]) &&
    since.ok &&
    same(
      since.value?.songs.map(({ songNo }) => songNo),
      ["1003"],
    ) &&
    same(since.value?.removed, ["1039"]);

  const names = await call<{ ok: boolean; value?: { pages: { title: string }[] } }>(
    "window.abth.readChineseNames()",
  );
  results.chineseNamesRead = names.ok && names.value?.pages.length === 5;
}
