/** The Overview's song search: its bar, the searches kept, a song's details and chart pictures. */
import { TITLE_PLATE } from "../mock-pictures";
import { PHONE_TALL, TOP_BAND_PX } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { hitsOn } from "./stand-in";

/** The stand-in's one picture of 1005's inner chart. */
const INNER_PICTURE = "/__charts/1005/ura-1.png";
const EDGE_PX = 24;
/** The narrowest phone the details are drawn for. */
const NARROW_PHONE = { width: 360, height: 780 } as const;

export const songSearchKeys = [
  "searchBarInTheTopBand",
  "searchBarAcrossAPhone",
  "searchFieldKeepsItsPlace",
  "searchShowsTheTempo",
  "searchKeptWhenASongOpens",
  "keptSearchesUnframed",
  "searchAgainFromTheKeptOne",
  "searchForgotten",
  "detailsOpenOnTheInnerChart",
  "detailsChartsShowTheirIcons",
  "chartPictureOpensFullScreen",
  "detailsOpenOnTheShownDifficulty",
  "detailsShowTheChartPictures",
  "chartPictureAskedOnce",
  "fiveChartsInOneRowOnAPhone",
  "detailsCloseOnlyWithAPointer",
  "menuSwipesOverTheDetails",
  "searchLeftByItsArrow",
  "portraitCloseToItsPlateOnAPhone",
] as const;

export async function songSearch(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { atSize, attribute, boxOf, exists, press, swipe, touchEmulated } = pageHelpers(page);
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
  const soon = (label: string, probe: () => Promise<boolean>) =>
    waitFor(label, async () => (await probe()) || undefined, 5_000).catch(() => false);
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

  const fieldLeft = () =>
    page.evaluate<number>(
      `document.querySelector("#song-search-input").getBoundingClientRect().left`,
    );
  const leftAtRest = await fieldLeft();
  await search("signal");
  await shown("#song-search-row-1019");
  results.searchFieldKeepsItsPlace = (await fieldLeft()) === leftAtRest;
  results.searchShowsTheTempo =
    (await textOf("#song-search-row-1019"))?.includes("BPM 85.85–257.5") === true;

  await openSong("signal", "1019");
  await closeSong();
  await search("");
  await shown("#song-search-recent");
  results.searchKeptWhenASongOpens = same(await kept(), ["signal"]);
  results.keptSearchesUnframed =
    !(await exists("#song-search-panel.MuiPaper-root")) &&
    !((await textOf("#song-search-panel")) ?? "").includes("Recent searches");

  await click("#song-search-recent li .MuiListItemButton-root");
  await shown("#song-search-row-1019");
  results.searchAgainFromTheKeptOne =
    (await page.evaluate<string>(`document.querySelector("#song-search-input").value`)) ===
    "signal";

  await search("");
  await shown("#song-search-recent");
  await click("#song-search-recent li .MuiIconButton-root");
  await gone("#song-search-recent");
  results.searchForgotten = !(await exists("#song-search-panel"));

  await openSong("約束", "1005");
  results.detailsOpenOnTheInnerChart = (await chosenChart()) === "song-details-chart-ura";
  await pictureDrawn();
  results.detailsChartsShowTheirIcons = await soon("chart icons drawn", () =>
    page.evaluate<boolean>(
      `(() => { const icons = [...document.querySelectorAll("#song-details .course-icon img")]; return icons.length === 5 && icons.every((img) => img.complete && img.naturalWidth > 0); })()`,
    ),
  );
  await click("#song-details-pictures .chart-picture-open");
  await shown("#chart-viewer img");
  await page.evaluate(
    `document.querySelector(".chart-viewer-frame").dispatchEvent(new WheelEvent("wheel", { deltaY: -300, clientX: 100, clientY: 100, bubbles: true }))`,
  );
  results.chartPictureOpensFullScreen = await soon(
    "the picture zoomed",
    async () =>
      Number(
        await page.evaluate<string>(`document.querySelector(".chart-viewer-frame").dataset.scale`),
      ) > 1,
  );
  await press("Escape");
  await gone("#chart-viewer");
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

  results.fiveChartsInOneRowOnAPhone = await atSize(
    NARROW_PHONE.width,
    NARROW_PHONE.height,
    async () => {
      await openSong("約束", "1005");
      const tops = await page.evaluate<number[]>(
        `[...document.querySelectorAll('#song-details [role="group"] button')].map((button) => Math.round(button.getBoundingClientRect().top))`,
      );
      await closeSong();
      return tops.length === 5 && new Set(tops).size === 1;
    },
  );

  results.detailsCloseOnlyWithAPointer =
    (await exists("#song-search-input")) &&
    (await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
      await touchEmulated(true);
      try {
        await openSong("signal", "1019");
        const closeDrawn = await exists("#song-details-close");
        await press("Escape");
        await gone("#song-details");
        return !closeDrawn;
      } finally {
        await touchEmulated(false);
      }
    }));

  const menuOpen = async () => (await attribute("#nav-menu", "aria-expanded")) === "true";
  // Each slide ends before the next move: a closing menu still holds the keys from the details.
  const settle = () => Bun.sleep(500);
  results.menuSwipesOverTheDetails = await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
    await touchEmulated(true);
    try {
      await openSong("signal", "1019");
      await swipe({ x: 60, y: 420 }, { x: 200, y: 430 });
      const menuOnTop = await soon("the menu over the details", async () => {
        const drawn = await page.evaluate<boolean>(
          `(document.elementFromPoint(40, 420)?.closest(".MuiDrawer-paper") ?? null) !== null`,
        );
        return (await menuOpen()) && drawn;
      });
      await settle();
      await swipe({ x: 200, y: 420 }, { x: 60, y: 425 });
      const menuShut = await soon("the menu shut", async () => !(await menuOpen()));
      await settle();
      const detailsKept = await exists("#song-details-title");
      await press("Escape");
      await gone("#song-details");
      return menuOnTop && menuShut && detailsKept;
    } finally {
      await touchEmulated(false);
    }
  });

  await search("signal");
  await click("#song-search-leave");
  await gone("#song-search-panel");
  results.searchLeftByItsArrow =
    (await page.evaluate<boolean>(
      `(document.querySelector("#last-updated")?.getClientRects().length ?? 0) > 0`,
    )) &&
    (await page.evaluate<string>(`document.querySelector("#song-search-input").value`)) === "";

  results.portraitCloseToItsPlateOnAPhone = await atSize(PHONE_TALL.width, PHONE_TALL.height, () =>
    soon("the plate's empty top under the portrait", async () => {
      const myDon = await boxOf("#my-don");
      const plate = await boxOf("#title-plate");
      const panel = await boxOf("#score-panel");
      // The stand-in plate's tab is the first thing it draws under the portrait.
      const drawnTop = plate.top + (plate.height * TITLE_PLATE.tabTop) / TITLE_PLATE.height;
      const footIsThePortraits = await page.evaluate<boolean>(
        `(document.elementFromPoint(${myDon.left + myDon.width / 2}, ${myDon.bottom - 2})?.closest("#costume-open") ?? null) !== null`,
      );
      return (
        plate.top < myDon.bottom &&
        Math.abs(drawnTop - myDon.bottom - (panel.top - plate.bottom)) <= 2 &&
        footIsThePortraits
      );
    }),
  );
}
