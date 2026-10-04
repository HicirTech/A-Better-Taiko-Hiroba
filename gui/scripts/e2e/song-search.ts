/** The Overview's song search: its bar, the searches kept, a song's details and chart pictures. */
import { PHONE_TALL, TOP_BAND_PX } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { hitsOn } from "./stand-in";

/** The stand-in's one picture of 1005's inner chart. */
const INNER_PICTURE = "/__charts/1005/ura-1.png";
const EDGE_PX = 24;

export const songSearchKeys = [
  "searchBarInTheTopBand",
  "searchBarAcrossAPhone",
  "searchShowsTheTempo",
  "searchKeptWhenASongOpens",
  "searchAgainFromTheKeptOne",
  "searchForgotten",
  "detailsOpenOnTheInnerChart",
  "detailsOpenOnTheShownDifficulty",
  "detailsShowTheChartPictures",
  "chartPictureAskedOnce",
  "searchLeftByItsArrow",
] as const;

export async function songSearch(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { atSize, boxOf, exists, touchEmulated } = pageHelpers(page);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const search = (query: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector("#song-search-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(query)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const chosenChart = () =>
    page.evaluate<string | null>(
      `document.querySelector('#song-details [aria-pressed="true"]')?.id ?? null`,
    );
  const kept = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#song-search-recent .MuiListItemButton-root")].map((row) => row.textContent)`,
    );
  const openSong = async (query: string, songNo: string) => {
    await search(query);
    await shown(`#song-search-row-${songNo} button`);
    await page.evaluate(`document.querySelector("#song-search-row-${songNo} button").click()`);
    await shown("#song-details-title");
  };
  const closeSong = async () => {
    await click("#song-details-close");
    await gone("#song-details");
  };
  const pictureDrawn = () =>
    waitFor(
      "a chart picture drawn",
      async () =>
        (await page.evaluate<boolean>(
          `[...document.querySelectorAll("#song-details-pictures img.chart-picture")].some((img) => img.complete && img.naturalWidth > 0)`,
        )) || undefined,
    );
  const showDifficulty = async (difficulty: string) => {
    await goTo("settings");
    await shown(`#shown-difficulty-${difficulty}`);
    await click(`#shown-difficulty-${difficulty}`);
    await goTo("overview");
    await shown("#song-search-input");
  };

  await goTo("overview");
  await shown("#song-search");
  const bar = await boxOf("#song-search");
  results.searchBarInTheTopBand =
    bar.top >= 0 && bar.bottom <= TOP_BAND_PX && !(await exists("#song-search-panel"));
  results.searchBarAcrossAPhone = await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
    await touchEmulated(true);
    try {
      const across = await boxOf("#song-search");
      // The window's own scroll bar takes from its width on the desktop, as a phone's does not.
      const width = await page.evaluate<number>("document.documentElement.clientWidth");
      return (
        across.left <= EDGE_PX && across.right >= width - EDGE_PX && across.bottom <= TOP_BAND_PX
      );
    } finally {
      await touchEmulated(false);
    }
  });

  await search("signal");
  await shown("#song-search-row-1019");
  results.searchShowsTheTempo =
    (await textOf("#song-search-row-1019"))?.includes("BPM 85.85–257.5") === true;

  await openSong("signal", "1019");
  await closeSong();
  await search("");
  await shown("#song-search-recent");
  results.searchKeptWhenASongOpens = same(await kept(), ["signal"]);

  await click("#song-search-recent li .MuiListItemButton-root");
  await shown("#song-search-row-1019");
  results.searchAgainFromTheKeptOne =
    (await page.evaluate<string>(`document.querySelector("#song-search-input").value`)) ===
    "signal";

  await search("");
  await shown("#song-search-recent");
  await click("#song-search-recent li .MuiIconButton-root");
  await shown("#song-search-hint");
  results.searchForgotten = !(await exists("#song-search-recent"));

  await openSong("約束", "1005");
  results.detailsOpenOnTheInnerChart = (await chosenChart()) === "song-details-chart-ura";
  await pictureDrawn();
  const innerAsked = await hitsOn(INNER_PICTURE);
  await click("#song-details-chart-easy");
  await shown("#song-details-no-picture");
  results.detailsShowTheChartPictures =
    innerAsked === 1 && (await textOf("#song-details-bpm")) === "BPM 120–240";
  await closeSong();
  await openSong("約束", "1005");
  await pictureDrawn();
  results.chartPictureAskedOnce = (await hitsOn(INNER_PICTURE)) === 1;
  await closeSong();

  await showDifficulty("hard");
  await openSong("約束", "1005");
  const hardChosen = (await chosenChart()) === "song-details-chart-hard";
  await closeSong();
  await showDifficulty("oni");
  results.detailsOpenOnTheShownDifficulty = hardChosen;

  await search("signal");
  await click("#song-search-leave");
  await gone("#song-search-panel");
  results.searchLeftByItsArrow =
    (await page.evaluate<boolean>(
      `(document.querySelector("#last-updated")?.getClientRects().length ?? 0) > 0`,
    )) &&
    (await page.evaluate<string>(`document.querySelector("#song-search-input").value`)) === "";
}
