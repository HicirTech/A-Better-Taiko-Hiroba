import { HIROBA } from "./config";
import type { Ctx } from "./context";
import {
  hoverOver,
  middleOf,
  type Point,
  pageHelpers,
  pullAt,
  same,
  waitFor,
  withoutPictureBytes,
} from "./harness";
import { barOf, CROWN_SHARES, legendOf, type Share } from "./overview";
import {
  hitsOn,
  LANE_PICTURES,
  myPageHits,
  platesSettled,
  READ_AGAIN_MY_PAGE_READS,
  REFRESH,
  readHits,
  refreshHits,
  requestLog,
  resetLog,
} from "./stand-in";

export const readAgainKeys = [
  "rotationTakenUp",
  "readAgainAtTheNavFoot",
  "readAgainShutWhileReading",
  "readAgainShutsThenShowsItsSkeleton",
  "skeletonFieldAsWideAsThePages",
  "settingsSignedInWhileReading",
  "readAgainByF5",
  "readAgainRefreshesHirobaFirst",
  "failedRefreshStopsTheRead",
  "songSearchKeptWhenMyPageFails",
  "pullPastThePointReads",
  "pullOnlyDownFromTheTop",
  "portraitTooltipShutInPull",
] as const;

const SEARCHES_KEY = "abth.songSearches";

export async function readAgain(ctx: Ctx) {
  const { results, state, tokens } = ctx;
  const { click, currentPage, goTo, page, text, textOf, until } = ctx.app;
  const { atSize, attribute, boxOf, exists, fabState, pullIndicator, swipe, touchEmulated } =
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
  // A read again shuts the page at once and keeps it a moment, then its skeleton stands in.
  const pageAtOnce = await waitFor("the page shut", async () => {
    const now = await page.evaluate<{ kept: boolean; shut: boolean }>(
      `({ kept: document.querySelector("#profile") !== null, shut: document.querySelector("#page-shut")?.hasAttribute("inert") ?? false })`,
    );
    return now.shut ? now : undefined;
  });
  await waitFor("held read", async () => (await myPageHits()) > readsBeforeHeld || undefined);
  const fabWhileReading = await fabState();
  const skeletonWhileReading = await waitFor(
    "the skeleton of the page read again",
    async () => (await exists('#page-skeleton[data-page="overview"]')) || undefined,
  );
  const skeletonField = await boxOf('#page-skeleton[data-page="overview"] .MuiSkeleton-rounded');
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
  await waitFor("the page back", async () => (await exists("#profile")) || undefined);
  const pageField = await boxOf("#song-search");
  results.skeletonFieldAsWideAsThePages =
    Math.abs(skeletonField.left - pageField.left) <= 1 &&
    Math.abs(skeletonField.right - pageField.right) <= 1;
  results.readAgainShutsThenShowsItsSkeleton =
    pageAtOnce.kept &&
    skeletonWhileReading &&
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
  const refreshesBeforeF5 = await refreshHits();
  await resetLog();
  const F5 = { key: "F5", code: "F5", windowsVirtualKeyCode: 116 };
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...F5 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...F5 });
  await waitFor("a read by F5", async () => (await myPageHits()) > readsBeforeF5 || undefined);
  await waitFor("the read by F5 ended", async () =>
    same(await fabState(), { shut: false, spinning: false }) ? true : undefined,
  );
  results.readAgainByF5 =
    (await myPageHits()) === readsBeforeF5 + READ_AGAIN_MY_PAGE_READS &&
    (await page.evaluate<boolean>("window.notReloaded === true"));
  const sinceF5 = (await requestLog()).filter((line) => !LANE_PICTURES.includes(line));
  results.readAgainRefreshesHirobaFirst =
    (await refreshHits()) === refreshesBeforeF5 + 1 &&
    same(sinceF5.slice(0, 3), ["GET /mypage_top.php", `POST ${REFRESH}`, "GET /mypage_top.php"]);

  // A refresh Hiroba refuses is the read's failure, and nothing is read after it.
  await fetch(`${HIROBA}/__history?refresh=901`);
  const readsBeforeRefused = await myPageHits();
  await click("#read-again");
  await waitFor("the refused refresh", async () => (await exists("#failure-detail")) || undefined);
  const refusedRead = {
    words: (await text()).includes("Hiroba could not refresh your play data"),
    detail: (await textOf("#failure-detail"))?.includes("result=901") ?? false,
    reads: (await myPageHits()) - readsBeforeRefused,
  };

  // My page's read failed: the song search still finds and opens a song, the failure gives way.
  const searchesBefore = await page.evaluate<string | null>(
    `localStorage.getItem(${JSON.stringify(SEARCHES_KEY)})`,
  );
  const failureSeen = () =>
    page.evaluate<boolean>(`document.querySelector("#read-failure")?.checkVisibility() === true`);
  const fieldThere = await exists("#song-search-input");
  await page.evaluate(
    `(() => { const input = document.querySelector("#song-search-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "signal"); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
  );
  await waitFor(
    "a song found, my page unread",
    async () => (await exists("#song-search-row-1019 button")) || undefined,
  );
  const failureWhileSearching = await failureSeen();
  await click("#song-search-row-1019 button");
  await waitFor(
    "its details, my page unread",
    async () => (await exists("#song-details-title")) || undefined,
  );
  await click("#song-details-close");
  await waitFor("the details closed", async () =>
    (await exists("#song-details")) ? undefined : true,
  );
  await click("#song-search-leave");
  const failureBack = await waitFor(
    "the failure back",
    async () => (await failureSeen()) || undefined,
  );
  await page.evaluate(
    searchesBefore === null
      ? `localStorage.removeItem(${JSON.stringify(SEARCHES_KEY)})`
      : `localStorage.setItem(${JSON.stringify(SEARCHES_KEY)}, ${JSON.stringify(searchesBefore)})`,
  );
  results.songSearchKeptWhenMyPageFails = fieldThere && !failureWhileSearching && failureBack;
  await fetch(`${HIROBA}/__history?refresh=0`);
  const readsBeforeAgain = await myPageHits();
  await click("#read-again");
  await waitFor("the page read again", async () =>
    (await myPageHits()) > readsBeforeAgain &&
    (await exists("#profile")) &&
    same(await fabState(), { shut: false, spinning: false })
      ? true
      : undefined,
  );
  results.failedRefreshStopsTheRead = same(refusedRead, { words: true, detail: true, reads: 1 });

  await touchEmulated(true);
  const { pullFrom, pulledBy } = pullAt(profileBox);
  const readsByShortPull = await readsBySwipe(pullFrom, pulledBy(0, 100));
  const readsBeforePull = await myPageHits();
  const ringAtFullPull = await swipe(pullFrom, pulledBy(0, 200), pullIndicator);
  await Bun.sleep(500);
  await until("Last updated");
  // The Overview reads its pictures again by a hold, so past the point the hold's ring shows.
  results.pullPastThePointReads =
    readsByShortPull === 0 &&
    ringAtFullPull?.shown === true &&
    ringAtFullPull.holds &&
    (await myPageHits()) === readsBeforePull + READ_AGAIN_MY_PAGE_READS &&
    !(await pullIndicator()).shown;
  const readsByUpwardSwipe = await readsBySwipe(pulledBy(0, 200), pullFrom);
  const readsBySidewaysSwipe = await readsBySwipe(pullFrom, pulledBy(200, 40));
  // The window opens with the whole Overview in view: a shorter one lets it scroll.
  const readsByPullBelowTop = await atSize(946, 500, async () => {
    await page.evaluate("window.scrollTo(0, 200)");
    return readsBySwipe(pullFrom, pulledBy(0, 200));
  });
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
  "namedRankReadOffItsLabel",
  "unknownLabelReadOffThePlates",
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
    (await textOf("#dan-unreadable"))?.startsWith(
      "Your dan-i could not be read. Refreshing or trying again may fix this.",
    ) === true &&
    (await textOf("#dan-code")) ===
      "Code for a report: dan=notPng status=200 type=image/gif bytes=43" &&
    (await textOf("#dan")) === null &&
    (await textOf("#crowns-silver")) === "11 of 14" &&
    !afterGif.includes("000000000000") &&
    !afterGif.includes("imgsrc");
  // A read is two requests while my page shows a dan (the page and its label), one without, after
  // the read of my page for the refresh's token.
  results.twoRequestsWithDanOneWithout =
    JSON.stringify(requestsPerRead) === JSON.stringify([3, 3, 3, 2, 3]);
  results.danLabelPictureCostsNothing =
    results.twoRequestsWithDanOneWithout === true && results.danLabelShownAsPicture === true;

  // A 名人's label reads as its dan, with no plate asked.
  const PLATE = "/imgsrc_dani.php";
  let plates = await hitsOn(PLATE);
  await fetch(`${HIROBA}/__variant?dan=17&label=png`);
  await readShowing("#dan");
  results.namedRankReadOffItsLabel =
    (await textOf("#dan")) === "Dan-i: Meijin" &&
    (await textOf("#dan-unreadable")) === null &&
    (await hitsOn(PLATE)) === plates;
  // A label in a styling no template holds sends the read to the plates: 19, then a stamped 18.
  plates = await hitsOn(PLATE);
  await fetch(`${HIROBA}/__variant?dan=18&label=unknown`);
  await click("#read-again");
  await waitFor("超人 read off the plates", async () =>
    (await textOf("#dan")) === "Dan-i: Chojin" ? true : undefined,
  );
  results.unknownLabelReadOffThePlates = (await hitsOn(PLATE)) - plates === 2;
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
