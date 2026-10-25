/** Scores: read only when asked, every list and played chart first, then what recent plays name. */
import { LONG_HOLD_MS } from "../../src/ui/pull-gesture";
import { en, HIROBA, TOP_BAND_PX } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { hitsOn, myPageHits, READ_AGAIN_MY_PAGE_READS, refreshHits } from "./stand-in";

const SCORE_LIST = "/score_list.php";
const SCORE_DETAIL = "/score_detail.php";
const HISTORY_PAGE = "/history_recent_score.php";

export const scoresKeys = [
  "scoresReadOnlyWhenAsked",
  "scoresStartAtTheShownDifficulty",
  "scoresOpenSortedByRecentPlay",
  "firstReadTakesEveryScore",
  "laterReadDetailsWhatWasPlayed",
  "songReadAgainFromItsDetails",
  "stoppedReadNamesItsChart",
  "readFindingNothingNewSaysSo",
  "everyScoreReadAfterALongHold",
  "walkedPageInTheFoot",
  "walkedPageOnTheSkeleton",
  "hirobaReadsBesideAWalk",
  "recentPlaysKeptAfterSignOut",
  "difficultyFilterTakesSeveral",
  "scoresSortedByScore",
  "settingsSortOpensScoresOnIt",
  "scoresSearchInTheTopBand",
  "scoresSearchedByAnyName",
  "scoreDetailsHeadedLikeTheirRow",
  "scoreDetailsShowRankingAndSections",
  "sectionCrownsOverTheirScores",
  "songReadAgainByAPullOnItsDetails",
  "longPullAsksToReadEveryScore",
  "detailsStepAsideForThePipelines",
] as const;

const PHONE = { width: 390, height: 844 } as const;

const control = async <T>(path: string, params = ""): Promise<T> =>
  (await (await fetch(`${HIROBA}/${path}?${params}`)).json()) as T;
const history = (params = "") =>
  control<{ readonly shown: number; readonly asked: readonly number[] }>("__history", params);
const detailsAsked = async (params = "") =>
  (await control<{ readonly asked: readonly string[] }>("__scores", params)).asked;
/** The charts whose details were asked since the last take. */
const takeAsked = async () => {
  const asked = await detailsAsked();
  await detailsAsked("forget=1");
  return asked;
};
/** The stand-in's song `n` is song number 1000 + n, played at level 1 + n % 5. */
const levelOf = (n: number) => 1 + (n % 5);
const chart = (n: number) => `${1000 + n}/${levelOf(n)}`;
const sorted = (charts: readonly string[]) => [...charts].sort();
/** Every chart of song 1004, 裏 included, as a read of the song asks them. */
const SONG_1004 = ["1004/1", "1004/2", "1004/3", "1004/4", "1004/5"];
const isChart = (charted: string) => {
  const [songNo, level] = charted.split("/");
  return `(row) => row.dataset.songNo === "${songNo}" && row.dataset.level === "${level}"`;
};

interface ShownRow {
  readonly chart: string;
  readonly facts: string;
}

/** What a row, or the details' head, shows of a chart: its name, its marks and its lines. */
interface RowLook {
  readonly name: string;
  readonly marks: readonly (string | null)[];
  readonly facts: readonly string[];
}

export async function scores(ctx: Ctx) {
  const { results, tokens } = ctx;
  const { click, goTo, page, textOf, until } = ctx.app;
  const {
    atSize,
    attribute,
    boxOf,
    exists,
    fabState,
    inPlace,
    listRows,
    mousePress,
    press,
    rowInView,
    swipe,
    touchEmulated,
  } = pageHelpers(page);
  const shownRows = () =>
    listRows<ShownRow>(
      "#scores-list",
      `(row) => ({ chart: row.dataset.songNo + "/" + row.dataset.level, facts: row.querySelector(".song-line")?.textContent ?? "" })`,
    );
  const rowOf = (charted: string) => rowInView("#scores-list", isChart(charted));
  const rowsAre = (count: number) =>
    waitFor(`${count} score rows`, async () => (await shownRows()).length === count || undefined);
  const settled = () =>
    waitFor("the read settled", async () =>
      same(await fabState(), { shut: false, spinning: false }) && !(await exists("#page-skeleton"))
        ? true
        : undefined,
    );
  // Every read the player asks for starts with Hiroba's own refresh.
  const readAfter = async (ask: () => Promise<unknown>) => {
    const refreshes = await refreshHits();
    await ask();
    await waitFor("the read's refresh", async () => (await refreshHits()) > refreshes || undefined);
    await settled();
  };
  const readAgain = () => readAfter(() => click("#read-again"));
  const choose = async (chip: string, value: string) => {
    await click(`#${chip}`);
    await waitFor(`${chip}'s menu`, async () => (await exists(`#${chip}-${value}`)) || undefined);
    await click(`#${chip}-${value}`);
    await Bun.sleep(500);
  };
  const detailsOpened = async () => {
    await waitFor(
      "the score's details",
      async () => (await exists("#score-details-title")) || undefined,
    );
    return inPlace("#score-details");
  };
  const detailsShut = async () => {
    await press("Escape");
    await waitFor("the details shut", async () =>
      (await exists("#score-details")) ? undefined : true,
    );
    await Bun.sleep(500);
  };
  const typeInto = (selector: string, text: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );

  // The difficulty filter starts at Settings' difficulty: Extreme, which brings its Ura charts.
  await goTo("settings");
  await click("#shown-difficulty-oni");
  await goTo("scores");
  await Bun.sleep(500);
  results.scoresReadOnlyWhenAsked =
    (await textOf("#scores-empty")) === en.t("scores.emptyReadAgain") &&
    (await hitsOn(SCORE_LIST)) === 0 &&
    (await hitsOn(SCORE_DETAIL)) === 0;

  // Hiroba shows 38 plays, each of its own chart, enough for Rating and Know yourself after this:
  // the first read details each of them.
  const { shown } = await history("shown=38");
  await readAgain();
  const firstAsked = await takeAsked();
  const played = Array.from({ length: shown }, (_, index) => index + 1);
  const extreme = played.filter((n) => levelOf(n) >= 4).map(chart);
  await rowsAre(extreme.length);
  // The chip shows the difficulties' icons, and names them in words for screen readers.
  const difficultyChip = () => attribute("#scores-difficulty", "aria-label");
  const difficultyNamed = (...names: string[]) =>
    `${en.t("picker.difficulty")}: ${names.join(" · ")}`;
  results.scoresStartAtTheShownDifficulty =
    (await difficultyChip()) === difficultyNamed(en.t("difficulty.oni"), en.t("difficulty.ura")) &&
    same(sorted((await shownRows()).map((row) => row.chart)), sorted(extreme));
  // Recent plays first, as Settings starts: the stand-in's newest play is its last song.
  const songOf = (charted: string) => Number(charted.split("/")[0]);
  const newestFirst = [...extreme].sort((left, right) => songOf(right) - songOf(left));
  results.scoresOpenSortedByRecentPlay =
    (await textOf("#scores-sort")) === en.t("scores.sort.recent") &&
    same(
      (await shownRows()).map((row) => row.chart),
      newestFirst,
    );
  await mousePress("#scores-difficulty .MuiChip-deleteIcon", "left");
  await rowsAre(shown);
  results.firstReadTakesEveryScore =
    (await hitsOn(SCORE_LIST)) === 8 &&
    firstAsked.length === shown &&
    new Set(firstAsked).size === shown;

  // A replay and a new chart, taken in by the refresh: only those two are read again.
  await history("replay=5&play=1");
  await readAgain();
  const laterAsked = await takeAsked();
  await rowsAre(shown + 1);
  results.laterReadDetailsWhatWasPlayed =
    same(sorted(laterAsked), sorted([chart(5), chart(shown + 1)])) &&
    (await hitsOn(SCORE_LIST)) === 8 &&
    (await textOf(`${await rowOf(chart(5))} .song-line`)) === "801,005 · Max combo 120";

  // The refresh in a chart's details reads its song again: each of the song's charts.
  await click(`${await rowOf(chart(4))} .song-open`);
  await detailsOpened();
  await readAfter(() => click("#score-details-read-song"));
  results.songReadAgainFromItsDetails = same(sorted(await takeAsked()), SONG_1004);
  await detailsShut();
  await page.evaluate("window.scrollTo(0, 0)");

  // A chart that fails stops the read, which names it; the next read goes on with that chart.
  await history("play=1");
  const failing = chart(shown + 2);
  await detailsAsked(`fail=${failing}`);
  await readAgain();
  const failure = (await textOf("#scores-failure")) ?? "";
  await detailsAsked("fail=&forget=1");
  await readAgain();
  results.stoppedReadNamesItsChart =
    failure.includes(
      en.t("scores.failedChart", {
        song: `サンプル曲 ${shown + 2}`,
        difficulty: en.t("difficulty.easy"),
      }),
    ) &&
    same(await takeAsked(), [failing]) &&
    !(await exists("#scores-failure"));

  // Nothing played since: the read details no chart, and the page says why nothing changed.
  const saidAfterARead = await exists("#scores-nothing-new");
  await readAgain();
  results.readFindingNothingNewSaysSo =
    !saidAfterARead &&
    (await textOf("#scores-nothing-new")) === en.t("scores.nothingNew") &&
    (await takeAsked()).length === 0;

  // A long hold on read again asks before reading every score: no reads nothing, yes reads every
  // list and every played chart again.
  const longHeld = LONG_HOLD_MS + 500;
  const askedToReadEvery = () =>
    waitFor(
      "the read-every question",
      async () => (await exists("#scores-read-every-confirm")) || undefined,
    );
  const notAsked = async () => {
    await click("#scores-read-every-cancel");
    await waitFor("the question gone", async () =>
      (await exists("#scores-read-every")) ? undefined : true,
    );
    await Bun.sleep(500);
  };
  const listsBefore = await hitsOn(SCORE_LIST);
  const refreshesBefore = await refreshHits();
  await mousePress("#read-again", "left", longHeld);
  await askedToReadEvery();
  await notAsked();
  const noReadsNothing =
    (await refreshHits()) === refreshesBefore && (await detailsAsked()).length === 0;
  await mousePress("#read-again", "left", longHeld);
  await askedToReadEvery();
  await readAfter(() => click("#scores-read-every-confirm"));
  const everyPlayed = Array.from({ length: shown + 2 }, (_, index) => chart(index + 1));
  results.everyScoreReadAfterALongHold =
    noReadsNothing &&
    same(sorted(await takeAsked()), sorted(everyPlayed)) &&
    (await hitsOn(SCORE_LIST)) === listsBefore + 8;

  // A read held at its walk's first page: the foot and the skeleton name the page, and Hiroba's
  // other reads go on beside it.
  await history("replay=3&hold=1&forget=1");
  await click("#read-again");
  await waitFor("the held page", async () => (await history()).asked.includes(1) || undefined);
  // The progress is asked for five times a second.
  await Bun.sleep(500);
  const footWhileWalking = await textOf("#nav-last-updated");
  const skeletonWhileWalking = await textOf(
    '#page-skeleton[data-page="scores"] #page-skeleton-words',
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
  await goTo("scores");
  await settled();
  const walkingWords = en.t("scores.readingPlays", { page: "1" });
  results.walkedPageInTheFoot = footWhileWalking === walkingWords;
  results.walkedPageOnTheSkeleton = skeletonWhileWalking === walkingWords;
  results.hirobaReadsBesideAWalk = stillHeld;

  // A sign-out keeps the plays: signed in again, the next read's walk stops on its first page.
  await goTo("settings");
  await click("#sign-out");
  await until("Sign in to Hiroba");
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await goTo("scores");
  const pagesBeforeTheRead = await hitsOn(HISTORY_PAGE);
  await readAgain();
  results.recentPlaysKeptAfterSignOut = (await hitsOn(HISTORY_PAGE)) === pagesBeforeTheRead + 1;

  // The page starts at Settings' difficulty again each time it opens: let every chart show.
  await mousePress("#scores-difficulty .MuiChip-deleteIcon", "left");
  await rowsAre(shown + 2);

  // The difficulty menu ticks several at once, and stays open for the next.
  await click("#scores-difficulty");
  await waitFor(
    "the difficulty menu",
    async () => (await exists("#scores-difficulty-easy")) || undefined,
  );
  await click("#scores-difficulty-easy");
  await click("#scores-difficulty-normal");
  const menuStayed = await exists("#scores-difficulty-easy");
  await press("Escape");
  await Bun.sleep(500);
  const easyOrNormal = Array.from({ length: shown + 2 }, (_, index) => index + 1)
    .filter((n) => levelOf(n) <= 2)
    .map(chart);
  await rowsAre(easyOrNormal.length);
  results.difficultyFilterTakesSeveral =
    menuStayed &&
    same(sorted((await shownRows()).map((row) => row.chart)), sorted(easyOrNormal)) &&
    (await difficultyChip()) ===
      difficultyNamed(en.t("difficulty.easy"), en.t("difficulty.normal"));
  await mousePress("#scores-difficulty .MuiChip-deleteIcon", "left");
  await rowsAre(shown + 2);

  // By score, the highest first: each chart of the stand-in scores differently.
  await choose("scores-sort", "score");
  const byScore = (await shownRows()).map((row) =>
    Number(row.facts.split(" · ")[0]?.replace(/,/g, "")),
  );
  results.scoresSortedByScore =
    byScore.length === shown + 2 &&
    byScore.every((score, at) => at === 0 || (byScore[at - 1] ?? 0) >= score);

  // Settings' default sort opens the page on it, as each visit starts afresh.
  const startOn = async (choice: string) => {
    await goTo("settings");
    // The list opens on a press, as a mouse's does, not on a click.
    await mousePress("#starting-sort", "left");
    await waitFor(
      "the sorts' list",
      async () => (await exists(`#starting-sort-${choice}`)) || undefined,
    );
    await click(`#starting-sort-${choice}`);
    await Bun.sleep(500);
    await goTo("scores");
    await mousePress("#scores-difficulty .MuiChip-deleteIcon", "left");
    await rowsAre(shown + 2);
  };
  await startOn("score");
  const openedByScore = (await shownRows()).map((row) =>
    Number(row.facts.split(" · ")[0]?.replace(/,/g, "")),
  );
  results.settingsSortOpensScoresOnIt =
    (await textOf("#scores-sort")) === en.t("scores.sort.score") &&
    openedByScore.every((score, at) => at === 0 || (openedByScore[at - 1] ?? 0) >= score);
  await startOn("recent");

  // The search sits in the top band, and stays there as the list scrolls under it.
  const searchInTheBand = async () => {
    const bar = await boxOf("#scores-search");
    return bar.top >= 0 && bar.bottom <= TOP_BAND_PX;
  };
  const bandAtTheTop = await searchInTheBand();
  await page.evaluate("window.scrollTo(0, 400)");
  await Bun.sleep(200);
  const bandScrolled = await searchInTheBand();
  await page.evaluate("window.scrollTo(0, 0)");
  results.scoresSearchInTheTopBand = bandAtTheTop && bandScrolled;

  // A search finds a song by any of its names: taiko.wiki's English one here.
  await typeInto("#scores-search-input", "sketch");
  await rowsAre(1);
  results.scoresSearchedByAnyName = same(
    (await shownRows()).map((row) => row.chart),
    [chart(1)],
  );
  await typeInto("#scores-search-input", "");
  await rowsAre(shown + 2);

  // A row opens its details, headed as the row is but for its hits, which the facts list below;
  // there the Japan place and the sections, each section's crown over its score.
  const lookOf = (selector: string) =>
    page.evaluate<RowLook>(
      `(() => { const row = document.querySelector(${JSON.stringify(selector)}); return { name: row.querySelector(".song-name").textContent, marks: [...row.querySelectorAll(".play-marks [role=img]")].map((mark) => mark.getAttribute("aria-label")), facts: [...row.querySelectorAll(".song-line")].map((line) => line.textContent) }; })()`,
    );
  const sixth = await rowOf(chart(6));
  const rowLook = await lookOf(sixth);
  await mousePress(sixth, "left");
  await detailsOpened();
  const headLook = await lookOf("#score-details .song-row");
  results.scoreDetailsHeadedLikeTheirRow =
    headLook.name === rowLook.name &&
    headLook.marks.length > 0 &&
    same(headLook.marks, rowLook.marks) &&
    same(headLook.facts, rowLook.facts.slice(0, 1));
  const laidOut = await page.evaluate<{ sections: number; crownsOver: boolean }>(`(() => {
    const box = (element) => element.getBoundingClientRect();
    const sections = [...document.querySelectorAll("#score-details-sections .score-section")];
    const crownsOver = sections.every((section) => {
      const crown = section.querySelector(".section-crown [role=img]");
      const score = section.querySelector(".section-score");
      return crown !== null && score !== null && box(crown).bottom <= box(score).top + 1 &&
        Math.abs(box(crown).right - box(score).right) < 2;
    });
    return { sections: sections.length, crownsOver };
  })()`);
  results.scoreDetailsShowRankingAndSections =
    laidOut.sections === 3 &&
    (await textOf("#score-details-ranking")) ===
      `${en.t("scores.ranking")} · ${en.t("scores.place", { place: "1,006" })}`;
  results.sectionCrownsOverTheirScores = laidOut.crownsOver;
  await detailsShut();

  // On a phone a pull on the details reads their song again, and they step aside for the
  // pipelines page until the swipe comes back past the menu.
  await atSize(PHONE.width, PHONE.height, async () => {
    const menuOpen = async () => (await attribute("#nav-menu", "aria-expanded")) === "true";
    await touchEmulated(true);
    try {
      await Bun.sleep(500);
      // A pull held past the point asks the same, and the lift after it reads nothing.
      await page.evaluate("window.scrollTo(0, 0)");
      const refreshesBeforeTheHold = await refreshHits();
      const heldPullAsked = await swipe({ x: 195, y: 300 }, { x: 197, y: 520 }, async () => {
        await Bun.sleep(longHeld);
        return exists("#scores-read-every-confirm");
      });
      await notAsked();
      results.longPullAsksToReadEveryScore =
        heldPullAsked === true && (await refreshHits()) === refreshesBeforeTheHold;

      await takeAsked();
      await click(`${await rowOf(chart(4))} .song-open`);
      await detailsOpened();
      const refreshes = await refreshHits();
      await swipe({ x: 195, y: 300 }, { x: 197, y: 520 });
      await waitFor(
        "the pull's refresh",
        async () => (await refreshHits()) > refreshes || undefined,
      );
      const pulled = await waitFor("the song read", async () => {
        const asked = await detailsAsked();
        return asked.length === SONG_1004.length && !(await exists("#score-details [inert]"))
          ? asked
          : undefined;
      });
      await takeAsked();
      results.songReadAgainByAPullOnItsDetails = same(sorted(pulled), SONG_1004);

      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await waitFor("the menu over the details", async () => (await menuOpen()) || undefined);
      await Bun.sleep(500);
      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await waitFor("the pipelines page", async () => (await exists("#pipeline-io")) || undefined);
      await Bun.sleep(500);
      const steppedAside = !(await exists("#score-details"));
      await swipe({ x: 300, y: 420 }, { x: 180, y: 425 });
      await waitFor("the menu again", async () => (await menuOpen()) || undefined);
      await Bun.sleep(500);
      await swipe({ x: 220, y: 420 }, { x: 100, y: 425 });
      await waitFor("the menu shut", async () => ((await menuOpen()) ? undefined : true));
      results.detailsStepAsideForThePipelines = steppedAside && (await detailsOpened());
      await detailsShut();
    } finally {
      await touchEmulated(false);
    }
  });
  await goTo("overview");
}
