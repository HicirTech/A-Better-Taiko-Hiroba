/** Scores: read only when asked, every list and played chart first, then what recent plays name. */
import { en, HIROBA } from "./config";
import type { Ctx } from "./context";
import { middleOf, pageHelpers, same, waitFor } from "./harness";
import { hitsOn, refreshHits } from "./stand-in";

const SCORE_LIST = "/score_list.php";
const SCORE_DETAIL = "/score_detail.php";

export const scoresKeys = [
  "scoresReadOnlyWhenAsked",
  "firstReadTakesEveryScore",
  "laterReadDetailsWhatWasPlayed",
  "recentPlaysWalkMarksScores",
  "songReadAgainFromItsMenu",
  "stoppedReadNamesItsChart",
  "readFindingNothingNewSaysSo",
] as const;

const control = async <T>(path: string, params = ""): Promise<T> =>
  (await (await fetch(`${HIROBA}/${path}?${params}`)).json()) as T;
const history = (params = "") => control<{ readonly shown: number }>("__history", params);
const detailsAsked = async (params = "") =>
  (await control<{ readonly asked: readonly string[] }>("__scores", params)).asked;
/** The charts whose details were asked since the last take. */
const takeAsked = async () => {
  const asked = await detailsAsked();
  await detailsAsked("forget=1");
  return asked;
};
/** The stand-in's song `n` is song number 1000 + n, played at level 1 + n % 5. */
const chart = (n: number) => `${1000 + n}/${1 + (n % 5)}`;
const sorted = (charts: readonly string[]) => [...charts].sort();

export async function scores(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { exists, fabState } = pageHelpers(page);
  const titles = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#scores-list .song-name")].map((name) => name.textContent)`,
    );
  const factsOf = (title: string) =>
    page.evaluate<string | null>(
      `[...document.querySelectorAll("#scores-list .history-row")].find((row) => row.querySelector(".song-name")?.textContent === ${JSON.stringify(title)})?.querySelector(".song-facts")?.textContent ?? null`,
    );
  const settled = () =>
    waitFor("the read settled", async () =>
      same(await fabState(), { shut: false, spinning: false }) && !(await exists("#scores-reading"))
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

  await goTo("scores");
  await Bun.sleep(500);
  results.scoresReadOnlyWhenAsked =
    (await textOf("#scores-empty")) === en.t("scores.emptyReadAgain") &&
    (await hitsOn(SCORE_LIST)) === 0 &&
    (await hitsOn(SCORE_DETAIL)) === 0;

  // Every chart Hiroba shows was played once: the first read details each of them.
  const { shown } = await history();
  await readAgain();
  const firstAsked = await takeAsked();
  results.firstReadTakesEveryScore =
    (await hitsOn(SCORE_LIST)) === 8 &&
    firstAsked.length === shown &&
    new Set(firstAsked).size === shown &&
    (await titles()).length === shown;

  // A replay and a new chart, taken in by the refresh: only those two are read again.
  await history("replay=5&play=1");
  await readAgain();
  const laterAsked = await takeAsked();
  results.laterReadDetailsWhatWasPlayed =
    same(sorted(laterAsked), sorted([chart(5), chart(shown + 1)])) &&
    (await hitsOn(SCORE_LIST)) === 8 &&
    (await factsOf("サンプル曲 5")) === "801,005 · Max combo 120" &&
    (await titles()).length === shown + 1;

  // A walk on the recent plays page marks the replay for the scores, which say so.
  await history("replay=7");
  await goTo("history");
  await readAgain();
  await goTo("scores");
  const unread = await waitFor(
    "the unread line",
    async () => (await textOf("#scores-unread")) ?? undefined,
  );
  await readAgain();
  results.recentPlaysWalkMarksScores =
    unread === en.t("scores.unread", { count: "1" }) && same(await takeAsked(), [chart(7)]);

  // A right-click on a row offers its song's read: each of the song's charts, 裏 included.
  const row = `#scores-list > li:nth-child(${(await titles()).indexOf("サンプル曲 4") + 1})`;
  await page.evaluate(
    `document.querySelector(${JSON.stringify(row)}).scrollIntoView({ block: "center" })`,
  );
  await Bun.sleep(300);
  const at = await middleOf(page, row);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  await page.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    ...at,
    button: "right",
    clickCount: 1,
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    ...at,
    button: "right",
    clickCount: 1,
  });
  await waitFor(
    "the song's menu",
    async () => (await exists("#scores-menu-read-song")) || undefined,
  );
  await readAfter(() => click("#scores-menu-read-song"));
  results.songReadAgainFromItsMenu = same(sorted(await takeAsked()), [
    "1004/1",
    "1004/2",
    "1004/3",
    "1004/4",
    "1004/5",
  ]);
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
  await goTo("overview");
}
