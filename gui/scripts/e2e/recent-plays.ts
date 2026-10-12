/** Recent plays: read only when asked, after Hiroba's refresh, in a pipeline of their own. */
import { mockTitle } from "../mock-history";
import { en, HIROBA } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { hitsOn, myPageHits, READ_AGAIN_MY_PAGE_READS, refreshHits } from "./stand-in";

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
  "hirobaReadsBesideAWalk",
  "recentPlaysKeptAfterSignOut",
] as const;

export const recentPlayDetailsKeys = [
  "playOpensItsKeptChartDetails",
  "unreadChartReadAsItsPlayOpens",
  "unknownSongSaysWhy",
] as const;

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

/** The row of `title`, scrolled into view: its marks' names, whether their pictures came, its facts. */
const rowLook = (title: string) =>
  `(() => {
    const row = [...document.querySelectorAll("#history-list .history-row")].find((li) => li.querySelector(".song-name")?.textContent === ${JSON.stringify(title)});
    if (row === undefined) return null;
    row.scrollIntoView({ block: "center" });
    const pictures = [...row.querySelectorAll(".play-marks img")];
    return {
      marks: [...row.querySelectorAll(".play-marks [role=img]")].map((mark) => mark.getAttribute("aria-label")),
      drawn: pictures.length > 0 && pictures.every((img) => img.complete && img.naturalWidth > 0),
      facts: [...row.querySelectorAll(".song-facts")].map((line) => line.textContent),
      named: (row.querySelector(".song-head .course-icon")?.getAttribute("aria-label") ?? null) !== null && (row.querySelector(".song-bars")?.getAttribute("aria-label") ?? null) !== null,
      support: row.querySelector(".play-marks svg[aria-label]") !== null,
    };
  })()`;

/** The recent plays page's titles, and its read again. */
function historyPage(ctx: Ctx) {
  const { click, page } = ctx.app;
  const { fabState } = pageHelpers(page);
  const titles = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#history-list .song-name")].map((name) => name.textContent)`,
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
  const { exists, fabState } = pageHelpers(page);
  const { titles, walkEnded, readAgain } = historyPage(ctx);
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
    const name = await page.evaluate<{ text: string | null; lang: string | null } | null>(
      `(() => { const name = [...document.querySelectorAll("#history-list .song-name")][21]; return name ? { text: name.textContent, lang: name.getAttribute("lang") } : null; })()`,
    );
    return name?.text === "Sample Song Two" ? name : undefined;
  }).catch(() => null);
  results.playNamedFromTheSongList =
    second?.lang === "en" && (await titles())[22] === "サンプル曲 1";

  // Play 12 has a gold crown, rank 7, きまぐれ, ドロン and speed 1.5; play 13 the support chart.
  const twelfth = await waitFor("play 12's icons", async () => {
    const look = await page.evaluate<RowLook | null>(rowLook("サンプル曲 12"));
    return look?.drawn === true ? look : undefined;
  });
  const thirteenth = await page.evaluate<RowLook | null>(rowLook("サンプル曲 13"));
  results.rowMarksDrawnAsIcons =
    same(twelfth.marks, [
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
  results.hirobaReadsBesideAWalk = stillHeld;

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
  const { goTo, page, textOf } = ctx.app;
  const { exists, press } = pageHelpers(page);
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
  const openPlay = (n: number) =>
    page.evaluate(
      `[...document.querySelectorAll("#history-list .history-row")].find((row) => row.querySelector(".song-name")?.textContent === ${JSON.stringify(mockTitle(n))}).click()`,
    );
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
