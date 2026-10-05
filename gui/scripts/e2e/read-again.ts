import { HIROBA } from "./config";
import type { Ctx } from "./context";
import {
  hoverOver,
  middleOf,
  type Point,
  pageHelpers,
  same,
  waitFor,
  withoutPictureBytes,
} from "./harness";
import { barOf, CROWN_SHARES, legendOf, type Share } from "./overview";
import { myPageHits, platesSettled, readHits } from "./stand-in";

export const readAgainKeys = [
  "rotationTakenUp",
  "readAgainAtTheNavFoot",
  "readAgainShutWhileReading",
  "readAgainKeepsThePageInPlace",
  "settingsSignedInWhileReading",
  "readAgainByF5",
  "pullPastThePointReads",
  "pullOnlyDownFromTheTop",
  "portraitTooltipShutInPull",
] as const;

export async function readAgain(ctx: Ctx) {
  const { results, state, tokens } = ctx;
  const { click, currentPage, goTo, page, text, textOf, until } = ctx.app;
  const { attribute, boxOf, exists, fabState, pullIndicator, swipe, touchEmulated } =
    pageHelpers(page);

  await fetch(`${HIROBA}/__rotate`);
  await click("#read-again");
  await Bun.sleep(500);
  await until("Last updated");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await click("#read-again");
  await Bun.sleep(500);
  await until("Last updated");
  results.rotationTakenUp =
    tokens[1] !== tokens[0] &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    !(await text()).includes("ended");
  const platesAfterRereads = await platesSettled();
  state.platesAfterRereads = platesAfterRereads;

  const footBox = await boxOf("#read-again");
  const pagesBox = await boxOf("nav");
  const profileBox = await boxOf("#profile");
  await hoverOver(page, "#read-again");
  const footTooltip = await waitFor(
    "Read again tooltip",
    async () => (await textOf('[role="tooltip"]')) ?? undefined,
  );
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  results.readAgainAtTheNavFoot =
    (await attribute("#read-again", "aria-label")) === "Read again" &&
    footTooltip === "Read again" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#read-again").closest(".MuiDrawer-paper") !== null && document.querySelector(".MuiFab-root") === null`,
    )) &&
    footBox.top >= pagesBox.bottom &&
    ((await textOf("#nav-last-updated")) ?? "").startsWith("Last updated");

  const readsBeforeHeld = await myPageHits();
  await fetch(`${HIROBA}/__hold-read?on=1`);
  await click("#read-again");
  await waitFor("held read", async () => (await myPageHits()) > readsBeforeHeld || undefined);
  const fabWhileReading = await fabState();
  const pageWhileReading = await page.evaluate<{ kept: boolean; shut: boolean }>(
    `({ kept: document.querySelector("#profile") !== null, shut: document.querySelector("#page-shut")?.hasAttribute("inert") ?? false })`,
  );
  await click("#read-again");
  await Bun.sleep(300);
  const readsWhileHeld = await myPageHits();
  await goTo("settings");
  const accountWhileReading = await page.evaluate<Record<string, unknown>>(
    `({ who: document.querySelector("#account-who")?.textContent ?? null, signOutShut: document.querySelector("#sign-out")?.disabled ?? null })`,
  );
  await goTo("overview");
  await fetch(`${HIROBA}/__hold-read?on=0`);
  // The page stays through a read, so its words say nothing of when the read ends.
  await waitFor("the read ended", async () =>
    same(await fabState(), { shut: false, spinning: false }) ? true : undefined,
  );
  results.readAgainKeepsThePageInPlace =
    pageWhileReading.kept &&
    pageWhileReading.shut &&
    !(await page.evaluate<boolean>(
      `document.querySelector("#page-shut")?.hasAttribute("inert") ?? true`,
    ));
  results.readAgainShutWhileReading =
    same(fabWhileReading, { shut: true, spinning: true }) &&
    readsWhileHeld === readsBeforeHeld + 1 &&
    same(await fabState(), { shut: false, spinning: false });
  results.settingsSignedInWhileReading = same(accountWhileReading, {
    who: "Signed in",
    signOutShut: true,
  });

  const readsBySwipe = async (from: Point, to: Point) => {
    const before = await myPageHits();
    await swipe(from, to);
    await Bun.sleep(500);
    await until("Last updated");
    await page.evaluate("window.scrollTo(0, 0)");
    return (await myPageHits()) - before;
  };

  // F5 reads again, and the window itself is not reloaded: the mark set here outlives the read.
  await page.evaluate("window.notReloaded = true");
  const readsBeforeF5 = await myPageHits();
  const F5 = { key: "F5", code: "F5", windowsVirtualKeyCode: 116 };
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...F5 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...F5 });
  await waitFor("a read by F5", async () => (await myPageHits()) > readsBeforeF5 || undefined);
  await waitFor("the read by F5 ended", async () =>
    same(await fabState(), { shut: false, spinning: false }) ? true : undefined,
  );
  results.readAgainByF5 =
    (await myPageHits()) === readsBeforeF5 + 1 &&
    (await page.evaluate<boolean>("window.notReloaded === true"));

  await touchEmulated(true);
  const pullFrom = { x: profileBox.left + profileBox.width / 2, y: profileBox.top + 40 };
  const pulledBy = (dx: number, dy: number) => ({ x: pullFrom.x + dx, y: pullFrom.y + dy });
  state.pull = { pullFrom, pulledBy };
  const readsByShortPull = await readsBySwipe(pullFrom, pulledBy(0, 100));
  const readsBeforePull = await myPageHits();
  const ringAtFullPull = await swipe(pullFrom, pulledBy(0, 200), pullIndicator);
  await Bun.sleep(500);
  await until("Last updated");
  results.pullPastThePointReads =
    readsByShortPull === 0 &&
    same(ringAtFullPull, { shown: true, ring: "100" }) &&
    (await myPageHits()) === readsBeforePull + 1 &&
    !(await pullIndicator()).shown;
  const readsByUpwardSwipe = await readsBySwipe(pulledBy(0, 200), pullFrom);
  const readsBySidewaysSwipe = await readsBySwipe(pullFrom, pulledBy(200, 40));
  await page.evaluate("window.scrollTo(0, 200)");
  const readsByPullBelowTop = await readsBySwipe(pullFrom, pulledBy(0, 200));
  results.pullOnlyDownFromTheTop =
    readsByUpwardSwipe === 0 && readsBySidewaysSwipe === 0 && readsByPullBelowTop === 0;
  const onTile = await middleOf(page, "#my-don");
  const readsBeforeSlowPull = await myPageHits();
  const tooltipInSlowPull = await swipe(onTile, { x: onTile.x, y: onTile.y + 100 }, async () => {
    await Bun.sleep(1000);
    return exists('[role="tooltip"]');
  });
  await Bun.sleep(500);
  results.portraitTooltipShutInPull =
    tooltipInSlowPull === false &&
    (await myPageHits()) === readsBeforeSlowPull &&
    (await currentPage()) === "overview";
  await touchEmulated(false);
  // The pull began on the portrait, whose tooltip now ignores the mouse: a new page has a new one.
  await goTo("settings");
  await goTo("overview");
}

export const profileVariantsKeys = [
  "medalCompleteShown",
  "medalOddShownWithTheRest",
  "medalNoneShown",
  "medalCountShown",
  "danLessRowRead",
  "lastUpdatedAtTheNavFoot",
  "unreadableDanShownWithTheRest",
  "twoRequestsWithDanOneWithout",
  "danLabelPictureCostsNothing",
  "panelZerosShown",
] as const;

export async function profileVariants(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, page, text, textOf } = ctx.app;
  const { allOf } = pageHelpers(page);
  const { lastUpdated } = state;

  const readShowing = async (selector: string) => {
    const before = await readHits();
    await click("#read-again");
    await waitFor(`${selector} shown`, async () =>
      (await textOf(selector)) === null ? undefined : true,
    );
    await Bun.sleep(300);
    return (await readHits()) - before;
  };
  const requestsPerRead: number[] = [];
  await fetch(`${HIROBA}/__medal?state=complete`);
  requestsPerRead.push(await readShowing("#medal-complete"));
  results.medalCompleteShown =
    (await textOf("#medal-complete")) === "COMPLETE" && (await textOf("#medal-count")) === null;
  await fetch(`${HIROBA}/__medal?state=odd`);
  requestsPerRead.push(await readShowing("#medal-code"));
  results.medalOddShownWithTheRest =
    (await textOf("#medal-code")) === "Code for a report: medal=noCountNoComplete" &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    (await textOf("#rank-8")) === "3 of 102" &&
    !(await text()).includes("did not expect");
  await fetch(`${HIROBA}/__medal?state=none`);
  requestsPerRead.push(await readShowing("#medal-none"));
  results.medalNoneShown = (await textOf("#medal-name")) === null;
  await fetch(`${HIROBA}/__medal?state=collecting`);
  await fetch(`${HIROBA}/__variant?dan=0&title=empty&region=unset`);
  requestsPerRead.push(await readShowing("#no-title"));
  results.medalCountShown = (await textOf("#medal-count")) === "Collected: 12";
  results.danLessRowRead =
    (await text()).includes("サンプルどん") &&
    (await textOf("#dan")) === null &&
    (await textOf("#dan-unreadable")) === null;
  // Brief, as the foot is narrow: no year and no seconds, and the time on one line.
  const LAST_UPDATED = /^Last updated [A-Z][a-z]{2}\s\d{1,2},\s\d{1,2}:\d{2}\s[AP]M$/;
  results.lastUpdatedAtTheNavFoot =
    LAST_UPDATED.test(lastUpdated.text) && lastUpdated.fontSize === "12px";
  await fetch(`${HIROBA}/__variant?dan=14&label=gif`);
  requestsPerRead.push(await readShowing("#dan-unreadable"));
  const afterGif = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.unreadableDanShownWithTheRest =
    (await textOf("#dan-unreadable")) === "Dan-i: couldn't read" &&
    (await textOf("#dan-code")) ===
      "Code for a report: dan=notPng status=200 type=image/gif bytes=43" &&
    (await textOf("#dan")) === null &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    !afterGif.includes("000000000000") &&
    !afterGif.includes("imgsrc");
  // A read is two requests while my page shows a dan (the page and its label), one without.
  results.twoRequestsWithDanOneWithout =
    JSON.stringify(requestsPerRead) === JSON.stringify([2, 2, 2, 1, 2]);
  results.danLabelPictureCostsNothing =
    results.twoRequestsWithDanOneWithout === true && results.danLabelShownAsPicture === true;
  await fetch(`${HIROBA}/__variant?dan=14&label=png&title=set&region=set`);

  await fetch(`${HIROBA}/__variant?panel=zeros`);
  await click("#read-again");
  await waitFor("zero panel", async () =>
    (await textOf("#crowns-silver")) === "0 of 0" ? true : undefined,
  );
  const ZERO_RANK_SHARES: readonly Share[] = [
    ["White Iki", "4.0%", 4],
    ["Bronze Iki", "9.1%", 9],
    ["Silver Iki", "18.2%", 18],
    ["Gold Miyabi", "31.3%", 31],
    ["Pink Miyabi", "25.3%", 25],
    ["Purple Miyabi", "12.1%", 12],
    ["Rainbow Kiwami", "0.0%", 0],
  ];
  const ZERO_CROWN_SHARES: readonly Share[] = CROWN_SHARES.map(([name]) => [name, "0.0%", 0]);
  const trackOf = (bar: string) =>
    page.evaluate<string>(
      `getComputedStyle(document.querySelector(${JSON.stringify(bar)})).backgroundColor`,
    );
  const NO_TRACK = "rgba(0, 0, 0, 0)";
  results.panelZerosShown =
    same(await allOf("#ranks li", "textContent"), legendOf(ZERO_RANK_SHARES, 99)) &&
    same(await allOf("#ranks-bar > *", "title"), barOf(ZERO_RANK_SHARES.slice(0, -1), 99)) &&
    same(await allOf("#crowns li", "textContent"), legendOf(ZERO_CROWN_SHARES, 0)) &&
    (await allOf("#crowns-bar > *", "title")).length === 0 &&
    (await trackOf("#crowns-bar")) !== NO_TRACK &&
    (await trackOf("#ranks-bar")) === NO_TRACK &&
    (await textOf("#score-panel-rank-8")) === "0" &&
    same(await allOf("#score-panel [id^='score-panel-crowns-']", "textContent"), ["0", "0", "0"]) &&
    (await textOf("#score-panel-rank-5")) === "31";
  await fetch(`${HIROBA}/__variant?panel=counts`);
}
