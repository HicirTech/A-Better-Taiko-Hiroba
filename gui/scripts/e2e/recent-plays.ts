/** Recent plays: read only when asked, after Hiroba's refresh, in a pipeline of their own. */
import { LONG_PRESS_MS } from "../../src/my-page/use-long-press";
import { LONG_HOLD_MS } from "../../src/read-again/pull-gesture";
import { mockTitle } from "../mock-history";
import { en, HIROBA } from "./config";
import type { Ctx } from "./context";
import { middleOf, pageHelpers, same, waitFor } from "./harness";
import {
  hitsOn,
  myPageHits,
  READ_AGAIN_MY_PAGE_READS,
  refreshHits,
  requestLog,
  resetLog,
} from "./stand-in";

const HISTORY_PAGE = "/history_recent_score.php";

export const recentPlaysKeys = [
  "recentPlaysReadOnlyWhenAsked",
  "firstWalkReadsTheFeed",
  "playNamedFromTheSongList",
  "walkRefreshesHirobaFirst",
  "rowMarksDrawnAsIcons",
  "laterWalkStopsAtAKeptRow",
  "failedPageNamedAndNothingKept",
  "readAgainWalksOnThePage",
  "walkedPageInTheFoot",
  "walkedPageOnTheSkeleton",
  "longHoldWalksEveryPlayAgain",
  "hirobaReadsBesideAWalk",
  "recentPlaysKeptAfterSignOut",
] as const;

export const recentPlayDetailsKeys = [
  "playOpensItsKeptChartDetails",
  "unreadChartReadAsItsPlayOpens",
  "unknownSongSaysWhy",
] as const;

export const recentPlaySetsKeys = [
  "rightClickOffersOneAction",
  "playMenuAddsToANewSet",
  "playNewSetCancelGoesBackToTheChooser",
  "playMenuMarksASetHoldingTheSong",
  "playMenuAddsToTheEndOfASet",
  "playMenuSendsNothingToHiroba",
  "playMenuMarksAFullSet",
  "playMenuSaysWhyForAnUnknownSong",
  "playHeldOnAPhoneOffersTheSets",
] as const;

/** Where the app keeps the sets, as the Favourites page writes them. */
const SETS_KEY = "abth.favoriteSets";

interface KeptSet {
  readonly name: string;
  readonly songs: readonly string[];
}

/** A line of the add-to-set dialog: whether it is shut to a choice, and what it says. */
interface MenuLine {
  readonly refused: boolean;
  readonly text: string;
}

interface HistoryState {
  readonly shown: number;
  readonly pending: number;
  readonly refreshes: number;
  readonly asked: readonly number[];
}

interface RowLook {
  readonly marks: readonly (string | null)[];
  readonly drawn: boolean;
  readonly facts: readonly (string | null)[];
  readonly named: boolean;
  readonly support: boolean;
}

const history = async (params = ""): Promise<HistoryState> =>
  (await (await fetch(`${HIROBA}/__history?${params}`)).json()) as HistoryState;

const isTitled = (title: string) =>
  `(row) => row.querySelector(".song-name")?.textContent === ${JSON.stringify(title)}`;

/** The row at `selector`: its marks' names, whether their pictures came, its facts. */
const rowLook = (selector: string) =>
  `(() => {
    const row = document.querySelector(${JSON.stringify(selector)});
    if (row === null) return null;
    const pictures = [...row.querySelectorAll(".play-marks img")];
    return {
      marks: [...row.querySelectorAll(".play-marks [role=img]")].map((mark) => mark.getAttribute("aria-label")),
      drawn: pictures.length > 0 && pictures.every((img) => img.complete && img.naturalWidth > 0),
      facts: [...row.querySelectorAll(".song-line")].map((line) => line.textContent),
      named: (row.querySelector(".course-icon")?.getAttribute("aria-label") ?? null) !== null && (row.querySelector(".song-bars")?.getAttribute("aria-label") ?? null) !== null,
      support: row.querySelector(".play-marks svg[aria-label]") !== null,
    };
  })()`;

/** The recent plays page's titles, and its read again. */
function historyPage(ctx: Ctx) {
  const { click, page } = ctx.app;
  const { fabState, listRows } = pageHelpers(page);
  const titles = () =>
    listRows<string>(
      "#history-list",
      `(row) => row.querySelector(".song-name")?.textContent ?? ""`,
    );
  const walkEnded = () =>
    waitFor("the walk ended", async () =>
      same(await fabState(), { shut: false, spinning: false }) ? true : undefined,
    );
  // The page has no button of its own: Read again, its keys or a pull read the plays again.
  const readAgain = async () => {
    const refreshes = await refreshHits();
    await click("#read-again");
    await waitFor("the walk's refresh", async () => (await refreshHits()) > refreshes || undefined);
  };
  return { titles, walkEnded, readAgain };
}

export async function recentPlays(ctx: Ctx) {
  const { results, tokens } = ctx;
  const { click, goTo, page, textOf, until } = ctx.app;
  const { exists, fabState, listRows, mousePress, rowInView } = pageHelpers(page);
  const { titles, walkEnded, readAgain } = historyPage(ctx);
  const lookOf = async (title: string) =>
    page.evaluate<RowLook | null>(rowLook(await rowInView("#history-list", isTitled(title))));
  const rowsAre = (count: number) =>
    waitFor(`${count} recent plays`, async () => (await titles()).length === count || undefined);

  await goTo("history");
  await Bun.sleep(500);
  results.recentPlaysReadOnlyWhenAsked =
    (await textOf("#history-empty")) === en.t("history.emptyReadAgain") &&
    !(await exists("#history-read")) &&
    (await hitsOn(HISTORY_PAGE)) === 0;

  // Hiroba shows 23 plays: four full pages and a short one.
  await history("shown=23");
  const refreshesBefore = await refreshHits();
  await readAgain();
  await rowsAre(23);
  await walkEnded();
  const firstWalk = await history();
  const firstTitles = await titles();
  results.firstWalkReadsTheFeed =
    firstTitles[0] === "サンプル曲 23" &&
    firstTitles[22] === "サンプル曲 1" &&
    firstWalk.asked[0] === 1 &&
    [1, 2, 3, 4, 5].every((page) => firstWalk.asked.filter((one) => one === page).length === 1);
  results.walkRefreshesHirobaFirst = (await refreshHits()) === refreshesBefore + 1;
  // The song list names play 2's song alone; the other plays keep Hiroba's titles.
  const second = await waitFor("play 2 named from the song list", async () => {
    const names = await listRows<{ text: string | null; lang: string | null }>(
      "#history-list",
      `(row) => { const name = row.querySelector(".song-name"); return { text: name?.textContent ?? null, lang: name?.getAttribute("lang") ?? null }; }`,
    );
    const name = names[21];
    return name?.text === "Sample Song Two" ? name : undefined;
  }).catch(() => null);
  results.playNamedFromTheSongList =
    second?.lang === "en" && (await titles())[22] === "サンプル曲 1";

  // Play 12: Hard, a gold crown, rank 7, きまぐれ, ドロン, speed 1.5; play 13: the support chart.
  const twelfth = await waitFor("play 12's icons", async () => {
    const look = await lookOf("サンプル曲 12");
    return look?.drawn === true ? look : undefined;
  });
  const thirteenth = await lookOf("サンプル曲 13");
  results.rowMarksDrawnAsIcons =
    same(twelfth.marks, [
      en.t("difficulty.hard"),
      en.t("crowns.gold"),
      en.t("scoreRank.7"),
      en.t("history.kimagure"),
      en.t("history.doron"),
      en.t("history.speed", { speed: "1.5" }),
    ]) &&
    same(twelfth.facts, ["800,012 · Max combo 120", "Good 400 · OK 30 · Bad 2 · Drumroll 9"]) &&
    twelfth.named &&
    thirteenth?.support === true;
  await page.evaluate("window.scrollTo(0, 0)");

  // Two more played at the arcade show once Hiroba refreshes; the walk stops on page 1.
  await history("play=2&forget=1");
  await readAgain();
  await rowsAre(25);
  await walkEnded();
  const laterWalk = await history();
  results.laterWalkStopsAtAKeptRow =
    (await titles())[0] === "サンプル曲 25" && same(laterWalk.asked, [1]);

  // Twelve more, and page 2 fails: the walk ends there, keeps nothing, and asks it once.
  await history("play=12&fail=2&forget=1");
  await readAgain();
  await waitFor("the walk's failure", async () => (await exists("#history-failure")) || undefined);
  await walkEnded();
  const failedWalk = await history("fail=0");
  results.failedPageNamedAndNothingKept =
    ((await textOf("#history-failure")) ?? "").includes("It stopped at page 2.") &&
    (await titles()).length === 25 &&
    failedWalk.asked.filter((one) => one === 2).length === 1;

  // A read again after the failure walks the feed again, and the notice goes.
  const refreshesBeforeAgain = await refreshHits();
  await history("forget=1");
  await readAgain();
  await rowsAre(37);
  await walkEnded();
  results.readAgainWalksOnThePage =
    (await titles())[0] === "サンプル曲 37" &&
    (await refreshHits()) === refreshesBeforeAgain + 1 &&
    !(await exists("#history-failure"));

  // A walk held at its first page: the foot names the page, and Hiroba's reads go on beside it.
  await history("play=1&hold=1&forget=1");
  await readAgain();
  await waitFor("the held page", async () => (await history()).asked.includes(1) || undefined);
  // The page is polled for five times a second.
  await Bun.sleep(500);
  const footWhileWalking = await textOf("#nav-last-updated");
  const skeletonWhileWalking = await textOf(
    '#page-skeleton[data-page="history"] #page-skeleton-words',
  );
  await goTo("overview");
  const myPageBefore = await myPageHits();
  await click("#read-again");
  await waitFor("my page read beside the walk", async () =>
    (await myPageHits()) === myPageBefore + READ_AGAIN_MY_PAGE_READS &&
    same(await fabState(), { shut: false, spinning: false })
      ? true
      : undefined,
  );
  const stillHeld = (await history()).asked.length === 1;
  await history("hold=0");
  await goTo("history");
  await rowsAre(38);
  await walkEnded();
  results.walkedPageInTheFoot = footWhileWalking === "Reading page 1…";
  results.walkedPageOnTheSkeleton = skeletonWhileWalking === "Reading page 1…";
  results.hirobaReadsBesideAWalk = stillHeld;

  // A long hold on read again asks before walking every page: no walks nothing, yes walks the
  // feed from its first page to its end, past the plays kept, and keeps what it read.
  const longHeld = LONG_HOLD_MS + 500;
  const askedToWalkEvery = () =>
    waitFor(
      "the walk-every question",
      async () => (await exists("#history-read-every-confirm")) || undefined,
    );
  await history("forget=1");
  await mousePress("#read-again", "left", longHeld);
  await askedToWalkEvery();
  await click("#history-read-every-cancel");
  await waitFor("the question gone", async () =>
    (await exists("#history-read-every")) ? undefined : true,
  );
  await Bun.sleep(500);
  const noWalksNothing = (await history()).asked.length === 0;
  await mousePress("#read-again", "left", longHeld);
  await askedToWalkEvery();
  await click("#history-read-every-confirm");
  await waitFor(
    "the walk of every page",
    async () => (await history()).asked.includes(8) || undefined,
  );
  await walkEnded();
  await rowsAre(38);
  results.longHoldWalksEveryPlayAgain = noWalksNothing && (await titles())[0] === "サンプル曲 38";

  // A sign-out keeps the plays: signed in again, the page shows them before any read.
  await goTo("settings");
  await click("#sign-out");
  await until("Sign in to Hiroba");
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  const pagesBeforeSignIn = await hitsOn(HISTORY_PAGE);
  await goTo("history");
  await rowsAre(38);
  results.recentPlaysKeptAfterSignOut = (await hitsOn(HISTORY_PAGE)) === pagesBeforeSignIn;
  await goTo("overview");
}

/** A play opens its chart's details: those kept at once, unread ones read there, else why not. */
export async function recentPlayDetails(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { exists, press, rowInView } = pageHelpers(page);
  const { titles, walkEnded, readAgain } = historyPage(ctx);
  const detailsAsked = async (params = "") =>
    ((await (await fetch(`${HIROBA}/__scores?${params}`)).json()) as { asked: string[] }).asked;
  /** The charts whose details were asked since the last take. */
  const takeAsked = async () => {
    const asked = await detailsAsked();
    await detailsAsked("forget=1");
    return asked;
  };
  const newestIs = (n: number) =>
    waitFor(
      `song ${n}'s play on top`,
      async () => (await titles())[0] === mockTitle(n) || undefined,
    );
  const openPlay = async (n: number) =>
    click(`${await rowInView("#history-list", isTitled(mockTitle(n)))} .song-open`);
  const chartShown = () =>
    waitFor(
      "the chart's details",
      async () => (await exists("#score-details-ranking")) || undefined,
    );
  const detailsShut = async () => {
    await press("Escape");
    await waitFor("the details shut", async () =>
      (await exists("#score-details")) ? undefined : true,
    );
    await Bun.sleep(500);
  };

  // The scores section detailed every chart played up to song 40: its play opens and reads nothing.
  await goTo("history");
  await newestIs(40);
  await takeAsked();
  const refreshesBefore = await refreshHits();
  await openPlay(40);
  await chartShown();
  results.playOpensItsKeptChartDetails =
    (await textOf("#score-details-title")) === mockTitle(40) &&
    (await takeAsked()).length === 0 &&
    (await refreshHits()) === refreshesBefore;
  await detailsShut();

  // Song 41 was listed unplayed: its play reads the song there, after Hiroba's refresh.
  await history("play=1");
  await readAgain();
  await walkEnded();
  await newestIs(41);
  await takeAsked();
  const refreshesBeforeTheRead = await refreshHits();
  await openPlay(41);
  await chartShown();
  results.unreadChartReadAsItsPlayOpens =
    (await textOf("#score-details-title")) === mockTitle(41) &&
    same([...(await takeAsked())].sort(), ["1041/1", "1041/2", "1041/3", "1041/4"]) &&
    (await refreshHits()) === refreshesBeforeTheRead + 1;
  await detailsShut();

  // Song 44 is in no list, nor in taiko.wiki: the details say why, and read nothing.
  await history("play=3");
  await readAgain();
  await walkEnded();
  await newestIs(44);
  const refreshesBeforeTheNotice = await refreshHits();
  await openPlay(44);
  const notice = await waitFor(
    "the play's notice",
    async () => (await textOf("#score-details-notice")) ?? undefined,
  );
  await Bun.sleep(500);
  results.unknownSongSaysWhy =
    notice === en.t("history.unknownSong") &&
    (await textOf("#score-details-title")) === mockTitle(44) &&
    (await takeAsked()).length === 0 &&
    (await refreshHits()) === refreshesBeforeTheNotice;
  await detailsShut();
  await goTo("overview");
}

/** A play's own menu adds its song to a set on the device, or to a new one, sending nothing. */
export async function recentPlaySets(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { exists, mousePress, press, rowInView, touchEmulated } = pageHelpers(page);
  const { titles } = historyPage(ctx);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const kept = () =>
    page.evaluate<KeptSet[]>(
      `(JSON.parse(localStorage.getItem(${JSON.stringify(SETS_KEY)}) ?? "{}").sets ?? []).map(({ name, songs }) => ({ name, songs }))`,
    );
  const rowOf = (n: number) => rowInView("#history-list", isTitled(mockTitle(n)));
  // A right-click's menu holds one action, which opens the dialog.
  const openDialog = async (n: number) => {
    await mousePress(await rowOf(n), "right");
    await shown("#history-play-menu");
    await click("#history-play-menu-add");
    await shown("#history-add-to-set");
  };
  const shutDialog = async () => {
    await press("Escape");
    await gone("#history-add-to-set");
    await Bun.sleep(300);
  };
  const lineOf = (selector: string) =>
    page.evaluate<MenuLine | null>(
      `(() => { const line = document.querySelector(${JSON.stringify(selector)}); return line === null ? null : { refused: line.classList.contains("Mui-disabled"), text: line.textContent }; })()`,
    );
  const before = await page.evaluate<string | null>(
    `localStorage.getItem(${JSON.stringify(SETS_KEY)})`,
  );

  await goTo("history");
  await waitFor("song 44's play on top", async () =>
    (await titles())[0] === mockTitle(44) ? true : undefined,
  );
  await resetLog();

  await mousePress(await rowOf(40), "right");
  await shown("#history-play-menu");
  const actions = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#history-play-menu [role=menuitem]")].map((item) => item.textContent)`,
  );
  await press("Escape");
  await gone("#history-play-menu");
  await Bun.sleep(300);
  results.rightClickOffersOneAction = same(actions, [en.t("history.addToSet")]);

  // A new set from the dialog starts with the play's song, named as the Favourites page names one.
  await openDialog(40);
  await click("#history-add-new-set");
  await shown("#favorite-set-name-dialog");
  await press("Escape");
  await gone("#favorite-set-name-dialog");
  results.playNewSetCancelGoesBackToTheChooser = await exists("#history-add-to-set");
  await click("#history-add-new-set");
  await shown("#favorite-set-name-dialog");
  await click("#favorite-set-name-save");
  await gone("#favorite-set-name-dialog");
  await gone("#history-add-to-set");
  const sets = await kept();
  const index = sets.length - 1;
  results.playMenuAddsToANewSet = same(sets[index]?.songs ?? [], ["1040"]);

  await openDialog(40);
  const holding = await lineOf(`#history-add-set-${index}`);
  await shutDialog();
  results.playMenuMarksASetHoldingTheSong =
    holding?.refused === true && holding.text.includes(en.t("history.setHolds"));

  await openDialog(41);
  await click(`#history-add-set-${index}`);
  await gone("#history-add-to-set");
  results.playMenuAddsToTheEndOfASet = same((await kept())[index]?.songs ?? [], ["1040", "1041"]);
  results.playMenuSendsNothingToHiroba = (await requestLog()).length === 0;

  // A full set, kept as the Favourites page keeps one, is read as the page opens again.
  await page.evaluate(
    `(() => { const kept = JSON.parse(localStorage.getItem(${JSON.stringify(SETS_KEY)})); kept.sets.push({ id: "e2e-full", name: "Full", songs: Array.from({ length: 30 }, (_, at) => String(2000 + at)) }); localStorage.setItem(${JSON.stringify(SETS_KEY)}, JSON.stringify(kept)); })()`,
  );
  await goTo("overview");
  await goTo("history");
  await waitFor("the plays shown again", async () =>
    (await titles())[0] === mockTitle(44) ? true : undefined,
  );
  await openDialog(41);
  const full = await lineOf(`#history-add-set-${index + 1}`);
  await shutDialog();
  results.playMenuMarksAFullSet =
    full?.refused === true && full.text.includes(en.t("history.setFull", { count: "30" }));

  // Song 44 is in no list, nor in taiko.wiki: the dialog says why, and offers no set.
  await openDialog(44);
  const unknown = await textOf("#history-add-unknown");
  const offersSets = await exists("#history-add-new-set");
  await shutDialog();
  results.playMenuSaysWhyForAnUnknownSong = unknown === en.t("history.unknownSong") && !offersSets;

  // A long press let go in place opens the dialog at once, and opens no details.
  await touchEmulated(true);
  try {
    const row = await rowOf(41);
    await page.evaluate(
      `document.querySelector(${JSON.stringify(row)}).scrollIntoView({ block: "center" })`,
    );
    await Bun.sleep(300);
    const at = await middleOf(page, row);
    await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
    await Bun.sleep(2 * LONG_PRESS_MS);
    await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await shown("#history-add-to-set");
    await Bun.sleep(500);
    const offered =
      (await exists(`#history-add-set-${index}`)) && (await exists("#history-add-new-set"));
    const menuOpened = await exists("#history-play-menu");
    const detailsOpened = await exists("#score-details");
    await shutDialog();
    results.playHeldOnAPhoneOffersTheSets = offered && !menuOpened && !detailsOpened;
  } finally {
    await touchEmulated(false);
  }

  await page.evaluate(
    before === null
      ? `localStorage.removeItem(${JSON.stringify(SETS_KEY)})`
      : `localStorage.setItem(${JSON.stringify(SETS_KEY)}, ${JSON.stringify(before)})`,
  );
  await goTo("overview");
}
