/** The pipelines page, one level past the pages' list: by its arrow, or by a swipe on a touch screen. */
import { PICTURE_NAMES } from "../../src/pipelines-page/operation-names";
import { en } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { platesAsked, readHits } from "./stand-in";

export const pipelinesPageKeys = [
  "pipelinesOpenByTheArrow",
  "playHistoryListsItsPages",
  "scoresListItsCharts",
  "endedGroupOpensItsDetails",
  "keptHistoryReachesTheSignIn",
  "picturesListedApart",
  "externalListsChartPictures",
  "pipelinesLeftByTheArrow",
  "pipelinesAskHirobaNothing",
  "pipelinesLeftByAPage",
  "arrowHiddenOnATouchScreen",
  "pipelinesSwipeOnThePanel",
  "pipelinesIgnoreSwipesPastThePanel",
  "pipelinesSwipeFromTheMenu",
] as const;

const TABLET = { width: 1056, height: 800 } as const;
const PHONE = { width: 390, height: 844 } as const;
const MY_PAGE_READ = "My page · Succeeded";
const MY_DON_READ = "My Don · Succeeded";
const CHART_PICTURE_READ = "Chart picture · Succeeded";
const PICTURE_NAMES_SHOWN = Object.values(PICTURE_NAMES).map((key) => en.t(key));
const namesAPicture = (line: string) =>
  PICTURE_NAMES_SHOWN.some((name) => line.startsWith(`${name} · `));
// When the group started, how long it took and how many requests it sent.
const FACTS = /^started \d{1,2}:\d{2}:\d{2}(\s[AP]M)? · took \d+(\.\d)? s · requests: \d+$/;
const ENDED_ROW = '[aria-label="Recently ended"] button';

export async function pipelinesPage(ctx: Ctx) {
  const { results } = ctx;
  const { click, currentPage, goTo, page, textOf } = ctx.app;
  const { atSize, attribute, exists, menuClosed, swipe, touchEmulated } = pageHelpers(page);
  const settle = () => Bun.sleep(500);
  // The page is there only while it is shown.
  const shown = () => exists("#pipeline-io");
  const opened = () => waitFor("the pipelines page", async () => (await shown()) || undefined);
  const closed = () =>
    waitFor("the pipelines page gone", async () => ((await shown()) ? undefined : true));
  const linesOf = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].map((line) => line.textContent)`,
    );
  const detailsOf = (section: string, head: string) =>
    waitFor(`${head} in the details`, async () => {
      const lines = await linesOf(`#${section}-details p`);
      return lines[0] === head ? lines : undefined;
    });
  const listedIn = (section: string, wanted: string) =>
    waitFor(`${wanted} listed`, async () => {
      const lines = await linesOf(`#${section} .MuiListItemText-primary`);
      return lines.includes(wanted) ? lines : undefined;
    });

  await goTo("overview");
  const readsBefore = await readHits();
  const platesBefore = (await platesAsked()).length;
  await click("#nav-pipelines");
  await opened();
  // The page under it is only hidden: what is seen is the pipelines' five sections.
  const headings = await page.evaluate<(string | null)[]>(
    `[...document.querySelectorAll("main section")].filter((section) => section.checkVisibility()).map((section) => document.getElementById(section.getAttribute("aria-labelledby"))?.textContent ?? null)`,
  );
  results.pipelinesOpenByTheArrow =
    (await attribute("#nav-pipelines", "aria-pressed")) === "true" &&
    (await textOf("main h1")) === "Pipelines" &&
    (await currentPage()) === null &&
    same(headings, [
      "Hiroba interaction",
      "Hiroba pictures",
      "Play history",
      "Scores",
      "External sources",
    ]);

  // The recent plays read before: each page a group, named by its page, the failed one with it.
  const walked = await page.evaluate<(string | null)[]>(
    `[...document.querySelectorAll(${JSON.stringify(`#pipeline-history ${ENDED_ROW}`)})].map((cell) => cell.getAttribute("aria-label"))`,
  );
  results.playHistoryListsItsPages =
    walked.length > 0 &&
    walked.every((label) => /^Recent plays, page \d+ · (Succeeded|Failed)$/.test(label ?? "")) &&
    walked.includes("Recent plays, page 1 · Succeeded");

  // The scores read before: each chart's details a group of their own, named by song and level.
  const detailed = await page.evaluate<(string | null)[]>(
    `[...document.querySelectorAll(${JSON.stringify(`#pipeline-scores ${ENDED_ROW}`)})].map((cell) => cell.getAttribute("aria-label"))`,
  );
  results.scoresListItsCharts =
    detailed.length > 0 &&
    detailed.every((label) =>
      /^Score details: song \d+, [A-Za-z ()]+ · (Succeeded|Failed)$/.test(label ?? ""),
    ) &&
    detailed.some((label) => label?.endsWith("Succeeded") === true);

  // A success opens its details as a failure does; a second press puts them away.
  const newest = await waitFor("an ended Hiroba group", async () => {
    const cells = await page.evaluate<(string | null)[]>(
      `[...document.querySelectorAll(${JSON.stringify(`#pipeline-io ${ENDED_ROW}`)})].map((cell) => cell.getAttribute("aria-label"))`,
    );
    return cells[0] ?? undefined;
  });
  await click(`#pipeline-io ${ENDED_ROW}`);
  const newestDetails = await detailsOf("pipeline-io", newest);
  const newestPressed = (await attribute(`#pipeline-io ${ENDED_ROW}`, "aria-pressed")) === "true";
  await click(`#pipeline-io ${ENDED_ROW}`);
  await waitFor("the details put away", async () =>
    (await exists("#pipeline-io-details")) ? undefined : true,
  );
  results.endedGroupOpensItsDetails = newestPressed && FACTS.test(newestDetails[1] ?? "");

  // The whole kept history, read again once listed, goes back to the sign-in's read of My page.
  await click('#pipeline-io button[aria-expanded="false"]');
  await settle();
  const hirobaListed = await listedIn("pipeline-io", MY_PAGE_READ);
  await page.evaluate(
    `[...document.querySelectorAll("#pipeline-io .MuiListItemButton-root")].findLast((item) => item.querySelector(".MuiListItemText-primary")?.textContent === ${JSON.stringify(MY_PAGE_READ)}).click()`,
  );
  const signInDetails = await detailsOf("pipeline-io", MY_PAGE_READ);
  results.keptHistoryReachesTheSignIn =
    signInDetails.length === 2 &&
    FACTS.test(signInDetails[1] ?? "") &&
    (await textOf('#pipeline-io button[aria-expanded="true"]')) === "Less";

  // Hiroba's pictures are listed in a section of their own, each by what it shows.
  await click('#pipeline-pictures button[aria-expanded="false"]');
  await settle();
  const picturesListed = await listedIn("pipeline-pictures", MY_DON_READ);
  await page.evaluate(
    `[...document.querySelectorAll("#pipeline-pictures .MuiListItemButton-root")].find((item) => item.querySelector(".MuiListItemText-primary")?.textContent === ${JSON.stringify(MY_DON_READ)}).click()`,
  );
  const myDonDetails = await detailsOf("pipeline-pictures", MY_DON_READ);
  results.picturesListedApart =
    picturesListed.every(namesAPicture) &&
    !hirobaListed.some((line) => namesAPicture(line) || line.startsWith("Picture · ")) &&
    FACTS.test(myDonDetails[1] ?? "");

  // Chart pictures come from other sites: they are listed with those, not with Hiroba's.
  await click('#pipeline-external button[aria-expanded="false"]');
  await settle();
  await listedIn("pipeline-external", CHART_PICTURE_READ);
  results.externalListsChartPictures = !picturesListed.some((line) =>
    line.startsWith("Chart picture ·"),
  );

  await click("#nav-pipelines");
  await closed();
  results.pipelinesLeftByTheArrow =
    (await attribute("#nav-pipelines", "aria-pressed")) === "false" &&
    (await textOf("main h1")) === "Overview" &&
    (await currentPage()) === "overview" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#profile")?.checkVisibility() === true`,
    ));
  // The Overview was kept under it: back on it, nothing is read again.
  results.pipelinesAskHirobaNothing =
    (await readHits()) === readsBefore && (await platesAsked()).length === platesBefore;

  await click("#nav-pipelines");
  await opened();
  await goTo("settings");
  await closed();
  results.pipelinesLeftByAPage = (await textOf("main h1")) === "Settings";

  // Favourites has no tooltips: a touch that starts on one makes MUI ignore later mouse hovers.
  await goTo("favorites");
  const arrowFrame = () =>
    page.evaluate<number>(
      `document.querySelector("#nav-pipelines")?.parentElement?.getBoundingClientRect().width ?? -1`,
    );
  // A tablet's window is wide: its panel is the menu always open, and the swipe goes past it.
  await atSize(TABLET.width, TABLET.height, async () => {
    const frameForAMouse = await arrowFrame();
    await touchEmulated(true);
    try {
      await settle();
      results.arrowHiddenOnATouchScreen = frameForAMouse >= 30 && (await arrowFrame()) <= 2;

      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await opened();
      await settle();
      await swipe({ x: 700, y: 420 }, { x: 560, y: 425 });
      await closed();
      results.pipelinesSwipeOnThePanel = (await currentPage()) === "favorites";
      await settle();

      let openedPastThePanel = false;
      for (const from of [
        { x: 260, y: 420 },
        { x: 600, y: 420 },
      ]) {
        await swipe(from, { x: from.x + 100, y: from.y + 5 });
        await settle();
        openedPastThePanel ||= await shown();
      }
      results.pipelinesIgnoreSwipesPastThePanel = !openedPastThePanel;
    } finally {
      await touchEmulated(false);
    }
  });

  // On a phone the menu holds the pages' list: the swipe goes on past it, and back to it.
  await atSize(PHONE.width, PHONE.height, async () => {
    const menuOpen = async () => (await attribute("#nav-menu", "aria-expanded")) === "true";
    await touchEmulated(true);
    try {
      await settle();
      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await waitFor("the menu opened by a swipe", async () => (await menuOpen()) || undefined);
      await settle();
      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await opened();
      const menuShut = !(await menuOpen());
      await settle();
      await swipe({ x: 300, y: 420 }, { x: 180, y: 425 });
      await closed();
      await waitFor("the menu again", async () => (await menuOpen()) || undefined);
      results.pipelinesSwipeFromTheMenu = menuShut && (await currentPage()) === "favorites";
      await click(".MuiBackdrop-root");
      await menuClosed();
    } finally {
      await touchEmulated(false);
    }
  });
  await goTo("overview");
}
