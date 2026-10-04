import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HIROBA, MY_DON_GIF_CODE, PANEL_ART, USER_DATA } from "./config";
import type { Ctx } from "./context";
import {
  hoverOver,
  type Page,
  pageHelpers,
  same,
  waitFor,
  waitForSeen,
  withoutPictureBytes,
} from "./harness";
import { CROWN_SHARES, namesOf, overviewHelpers, PANEL_COUNTS, RANK_SHARES } from "./overview";
import {
  askedAsMyPage,
  hitsOn,
  ICON_PATHS,
  iconsSettled,
  LEGEND_ICONS,
  medalPlatesSettled,
  myDonsAsked,
  myDonsSettled,
  myPageHits,
  platesSettled,
} from "./stand-in";

const medalIdShown = () =>
  /imgsrc_tokenplate\.php\?id=([0-9a-f]+)/.exec(
    readFileSync(join(USER_DATA, "debug", "mypage_top.php.html"), "utf8"),
  )?.[1] ?? "";

function pictureHelpers(page: Page) {
  const shownNow = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);

  return { shownNow };
}

export const myDonFailureKeys = ["readsAfterReadAgain", "myDonFailureCoded"] as const;

export async function myDonFailure(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, page, textOf, until } = ctx.app;
  const { exists } = pageHelpers(page);
  const { myDonFailureAtSignIn } = state;

  await click("#read-again");
  await until("Last updated");
  await Bun.sleep(300);
  results.readsAfterReadAgain = await myPageHits();

  await waitForSeen(
    "My Don asked",
    page,
    async () => (await myDonsAsked()).length > 1 || undefined,
  );
  const myDonsFailed = await myDonsSettled();
  state.myDonsFailed = myDonsFailed;
  results.myDonFailureCoded =
    myDonFailureAtSignIn &&
    myDonsFailed === 2 &&
    !(await exists("#my-don-image")) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
}

export const picturesKeys = [
  "myDonShown",
  "myDonAddressKeptOutOfDom",
  "myDonAgainOnReadAgain",
  "scorePanelArtShown",
  "legendIconsShown",
  "legendIconsAskedOnceEach",
  "legendNamesShownAsTooltips",
  "myDonMissingKeepsTheLast",
] as const;

export async function pictures(ctx: Ctx) {
  const running = ctx.app;
  const { results, state } = ctx;
  const { click, page, textOf, until } = running;
  const { allOf, attribute, boxOf, exists, tooltipClosed } = pageHelpers(page);
  const { legendIconsShownOn, legendPictures, panelCountsInPlace } = overviewHelpers(running);
  const { myDonsFailed } = state;

  await fetch(`${HIROBA}/__mydon?answer=png`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Last updated");
  await waitForSeen(
    "My Don picture",
    page,
    async () => (await attribute("#my-don-image", "src")) ?? undefined,
  );
  const myDonsAtFirst = await myDonsSettled();
  const tile = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#my-don").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  results.myDonShown =
    myDonsAtFirst === myDonsFailed + 1 &&
    (await attribute("#my-don-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    (await attribute("#my-don-image", "alt")) === "Your My Don, as Hiroba draws it" &&
    tile.width > 0 &&
    Math.abs(tile.width - tile.height) < 1 &&
    !(await exists("#my-don-loading")) &&
    (await textOf("#pictures-code")) ===
      "Code for a report: scorePanel=notPng status=404 type=text/plain;charset=utf-8 bytes=9";
  const withMyDon = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.myDonAddressKeptOutOfDom =
    !withMyDon.includes("mydon_") &&
    !withMyDon.includes("imgsrc") &&
    !withMyDon.includes("img.127.0.0.1") &&
    !withMyDon.includes("000000000000");

  const iconsBeforeRecovery = await iconsSettled();
  await fetch(`${HIROBA}/__panel?answer=png`);
  await fetch(`${HIROBA}/__icons?answer=png`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Last updated");
  await waitForSeen(
    "My Don asked again",
    page,
    async () => (await myDonsAsked()).length > myDonsAtFirst || undefined,
  );
  const myDonsAfterReadAgain = await myDonsSettled();
  results.myDonAgainOnReadAgain =
    myDonsAfterReadAgain === myDonsAtFirst + 1 &&
    (await attribute("#my-don-image", "src"))?.startsWith("data:image/png;base64,") === true;
  await waitForSeen(
    "score panel picture",
    page,
    async () => (await exists("#score-panel-image")) || undefined,
  );
  const art = await boxOf("#score-panel-image");
  const panelBox = await boxOf("#score-panel");
  results.scorePanelArtShown =
    (await hitsOn(PANEL_ART)) === 4 &&
    (await attribute("#score-panel-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    (await attribute("#score-panel-image", "alt")) === "" &&
    Math.abs(art.width / (art.bottom - art.top) - 600 / 356) < 0.02 &&
    Math.abs(art.width - panelBox.width) < 1 &&
    !(await exists("#score-panel-stand-in")) &&
    !(await exists("#score-panel-loading")) &&
    (await panelCountsInPlace(PANEL_COUNTS)) &&
    !(await exists("#pictures-unavailable"));
  const panelArtFetches = await hitsOn(PANEL_ART);
  state.panelArtFetches = panelArtFetches;
  await legendIconsShownOn(running);
  const iconFetches = await iconsSettled();
  state.iconFetches = iconFetches;
  const iconSources = await page.evaluate<Record<string, string>>(
    `Object.fromEntries([...document.querySelectorAll("#ranks li, #crowns li")].map((item) => [item.querySelector('[id]:not([id$="-percent"])').id, item.querySelector("img").getAttribute("src")]))`,
  );
  const pictureOf = (bytes: Uint8Array) =>
    `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  const iconBoxes = await page.evaluate<{ height: number; ratio: number }[]>(
    `[...document.querySelectorAll("#ranks li, #crowns li")].map((item) => { const box = item.querySelector('[aria-hidden="true"]').getBoundingClientRect(); return { height: box.height, ratio: box.width / box.height }; })`,
  );
  results.legendIconsShown =
    Object.entries(LEGEND_ICONS).every(([id, [, bytes]]) => iconSources[id] === pictureOf(bytes)) &&
    same(await legendPictures(running), { images: ICON_PATHS.length, dots: 0 }) &&
    iconBoxes.every(({ height }) => Math.abs(height - 24) < 0.5) &&
    iconBoxes.slice(0, 7).every(({ ratio }) => Math.abs(ratio - 128 / 96) < 0.05) &&
    iconBoxes.slice(7).every(({ ratio }) => Math.abs(ratio - 52 / 59) < 0.05) &&
    same(await allOf("#ranks li", "ariaLabel"), namesOf(RANK_SHARES)) &&
    same(await allOf("#crowns li", "ariaLabel"), namesOf(CROWN_SHARES));
  results.legendIconsAskedOnceEach = iconFetches - iconsBeforeRecovery === ICON_PATHS.length;

  const legendNameOnHover = async (selector: string) => {
    await page.evaluate(
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" })`,
    );
    await hoverOver(page, selector);
    const shown = await waitFor(
      "legend tooltip",
      async () => (await textOf('[role="tooltip"]')) ?? undefined,
    );
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
    await tooltipClosed();
    return shown;
  };
  const namesOnHover: string[] = [];
  for (const [block, shares] of [
    ["#ranks", RANK_SHARES],
    ["#crowns", CROWN_SHARES],
  ] as const) {
    for (let item = 1; item <= shares.length; item++) {
      namesOnHover.push(await legendNameOnHover(`${block} li:nth-child(${item})`));
    }
  }
  const SHIFT_KEY = { key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16 };
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...SHIFT_KEY });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft" });
  await page.evaluate(`document.querySelector("#crowns li").focus()`);
  const nameOnFocus = await waitFor(
    "legend tooltip on focus",
    async () => (await textOf('[role="tooltip"]')) ?? undefined,
  );
  await page.evaluate("document.activeElement.blur()");
  await tooltipClosed();
  const keyboardReachable = await page.evaluate<boolean>(
    `[...document.querySelectorAll("#ranks li, #crowns li")].every((item) => item.tabIndex === 0)`,
  );
  results.legendNamesShownAsTooltips =
    same(
      namesOnHover,
      [...RANK_SHARES, ...CROWN_SHARES].map(([name]) => name),
    ) &&
    nameOnFocus === CROWN_SHARES[0]?.[0] &&
    keyboardReachable;
  await page.evaluate("window.scrollTo(0, 0)");
  const keptMyDon = await attribute("#my-don-image", "src");
  await fetch(`${HIROBA}/__mydon?answer=gif`);
  await click("#read-again");
  await Bun.sleep(300);
  await until("Last updated");
  await waitForSeen(
    "My Don asked after a gif",
    page,
    async () => (await myDonsAsked()).length > myDonsAfterReadAgain || undefined,
  );
  const myDonsAfterGif = await myDonsSettled();
  results.myDonMissingKeepsTheLast =
    myDonsAfterGif === myDonsAfterReadAgain + 1 &&
    (await attribute("#my-don-image", "src")) === keptMyDon &&
    !(await exists("#pictures-unavailable"));
  await fetch(`${HIROBA}/__mydon?answer=png`);
}

export const titlePlateKeys = [
  "myDonAlignedWithoutThePlate",
  "plateBlankFallsBack",
  "plateOncePerTitle",
] as const;

export async function titlePlate(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, page, textOf, until } = ctx.app;
  const { tileAlignedAt } = overviewHelpers(ctx.app);
  const { shownNow } = pictureHelpers(page);
  const { platesAfterRereads, platesAtSignIn } = state;

  const platesBeforeOther = (await platesSettled()).length;
  const readAndWait = async (ready: () => Promise<boolean>) => {
    await click("#read-again");
    await Bun.sleep(300);
    await until("Last updated");
    await waitForSeen("read result", page, async () => (await ready()) || undefined);
    return platesSettled();
  };

  await fetch(`${HIROBA}/__titleplate?answer=gif`);
  await fetch(`${HIROBA}/__variant?title=other`);
  await readAndWait(() => shownNow("#pictures-code"));
  const blankShown =
    (await textOf("#pictures-code")) ===
      "Code for a report: titlePlate=notPng status=200 type=image/gif bytes=43" &&
    (await shownNow("#title-plate-stand-in")) &&
    !(await shownNow("#title-plate-image")) &&
    (await textOf("#profile-title")) === "Title: 別のサンプル称号" &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    (await textOf("#dan")) === "Dan-i: 9th Dan";
  results.myDonAlignedWithoutThePlate = await tileAlignedAt(1100);
  await fetch(`${HIROBA}/__titleplate?answer=png`);
  const afterOther = await readAndWait(() => shownNow("#title-plate-image"));
  results.plateBlankFallsBack =
    blankShown &&
    !(await shownNow("#pictures-unavailable")) &&
    afterOther.length - platesBeforeOther === 2;
  await fetch(`${HIROBA}/__variant?title=set`);
  await readAndWait(async () => (await textOf("#profile-title")) === "Title: サンプルの称号");
  await fetch(`${HIROBA}/__variant?title=other`);
  await readAndWait(async () => (await textOf("#profile-title")) === "Title: 別のサンプル称号");
  await fetch(`${HIROBA}/__variant?title=set`);
  const afterTitles = await readAndWait(
    async () => (await textOf("#profile-title")) === "Title: サンプルの称号",
  );
  results.plateOncePerTitle =
    platesAtSignIn.length === 1 &&
    platesAfterRereads.length === 1 &&
    afterTitles.length === afterOther.length &&
    askedAsMyPage(afterTitles);
}

export const medalPlateKeys = [
  "medalPlateAskedOnlyOnScreen",
  "medalPlateMissingReadsAsText",
  "medalPlateDrawnUnderText",
  "medalPlateOnAppSurface",
  "medalIdKeptOutOfDom",
  "medalPlateLaidOutAsOnHiroba",
  "medalPlateOncePerIdAndState",
] as const;

export async function medalPlate(ctx: Ctx) {
  const { medalIds, results } = ctx;
  const { click, page, textOf, until } = ctx.app;
  const { attribute } = pageHelpers(page);
  const { shownNow } = pictureHelpers(page);

  const readMedal = async () => {
    await click("#read-again");
    await Bun.sleep(300);
    await until("Last updated");
  };
  const showMedal = async (ready: () => Promise<boolean>) => {
    await page.evaluate(`document.querySelector("#medal").scrollIntoView({ block: "center" })`);
    await waitForSeen("medal result", page, async () => (await ready()) || undefined);
    return medalPlatesSettled();
  };
  const readMedalShowing = async (ready: () => Promise<boolean>) => {
    await readMedal();
    return showMedal(ready);
  };
  const medalPlateSrc = () => attribute("#medal-plate-image", "src");
  type Rect = { left: number; top: number; width: number; height: number };
  type MedalLayout = Record<
    string,
    (Rect & { size: number; weight: string; colour: string }) | null
  >;
  const MEDAL_WORDS = [
    "#medal-plate",
    "#medal-plate-image",
    "#medal-name",
    "#medal-count-shown",
    "#medal-complete",
  ];
  const medalLayout = () =>
    page.evaluate<MedalLayout>(
      `Object.fromEntries(${JSON.stringify(MEDAL_WORDS)}.map((selector) => { const element = document.querySelector(selector); if (element === null) return [selector, null]; const { left, top, width, height } = element.getBoundingClientRect(); const style = getComputedStyle(element); return [selector, { left, top, width, height, size: parseFloat(style.fontSize), weight: style.fontWeight, colour: style.color }]; }))`,
    );
  /** Hiroba's offsets in its pixels of the 290-wide block: the name at 50, the count or COMPLETE at
   * `left`, bold black 12; the picture 290 wide; the block 52 high, more under a taller picture. */
  const medalLaidOutAsOnHiroba = (layout: MedalLayout, ending: string, left: number) => {
    const [block, image, name, end] = [
      "#medal-plate",
      "#medal-plate-image",
      "#medal-name",
      ending,
    ].map((selector) => layout[selector]);
    if (!block || !image || !name || !end) {
      return false;
    }
    const unit = block.width / 290;
    const at = (box: Rect, side: "left" | "top") => (box[side] - block[side]) / unit;
    const nameMiddle = (name.top + name.height / 2 - block.top) / unit;
    return (
      block.height / unit >= 51.5 &&
      block.height / unit <= Math.max(52, image.height / unit + 8) &&
      Math.abs(image.width / unit - 290) < 0.5 &&
      Math.abs(at(image, "left")) < 0.5 &&
      Math.abs(at(image, "top")) < 0.5 &&
      Math.abs(at(name, "left") - 50) < 0.5 &&
      Math.abs(name.width / unit - 165) < 0.5 &&
      Math.abs(at(end, "left") - left) < 0.5 &&
      Math.abs(at(end, "top") - at(name, "top")) < 0.5 &&
      Math.abs(nameMiddle - image.height / unit / 2) < 2 &&
      [name, end].every(
        (words) =>
          Math.abs(words.size / unit - 12) < 0.1 &&
          Number(words.weight) >= 700 &&
          words.colour === "rgb(0, 0, 0)",
      )
    );
  };
  medalIds.push(medalIdShown());
  await fetch(`${HIROBA}/__tokenplate?answer=gif`);
  await fetch(`${HIROBA}/__medal?state=collecting&season=2`);
  const medalPlatesBefore = await medalPlatesSettled();
  // A viewport this short puts the card below the fold; the default 960×720 shows its top edge.
  const SHORT_VIEWPORT_PX = 400;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 0,
    height: SHORT_VIEWPORT_PX,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await readMedal();
  const newSeasonBelowFold =
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await page.evaluate<boolean>(
      `document.querySelector("#medal-plate").getBoundingClientRect().top >= innerHeight`,
    ));
  const medalPlatesOffScreen = await medalPlatesSettled();
  const medalPlatesPerRead = [await showMedal(() => shownNow("#medal-plate-code"))];
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  results.medalPlateAskedOnlyOnScreen =
    newSeasonBelowFold &&
    medalPlatesOffScreen === medalPlatesBefore &&
    medalPlatesPerRead[0] === medalPlatesBefore + 1;
  medalIds.push(medalIdShown());
  results.medalPlateMissingReadsAsText =
    (await textOf("#medal-plate-code")) ===
      "Code for a report: medalPlate=notPng status=200 type=image/gif bytes=43" &&
    (await shownNow("#medal-plate-stand-in")) &&
    !(await shownNow("#medal-plate-image")) &&
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await textOf("#medal-count")) === "Collected: 12";
  await fetch(`${HIROBA}/__tokenplate?answer=png`);
  medalPlatesPerRead.push(await readMedalShowing(() => shownNow("#medal-plate-image")));
  const medalBox = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#medal-plate-image").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  const collectingLayout = await medalLayout();
  results.medalPlateDrawnUnderText =
    (await medalPlateSrc())?.startsWith("data:image/png;base64,") === true &&
    Math.abs(medalBox.width / medalBox.height - 600 / 100) < 0.05 &&
    (await textOf("#medal-name")) === "どんメダル2026冬" &&
    (await textOf("#medal-count")) === "Collected: 12" &&
    (await textOf("#medal-plate"))?.replace("Collected: 12", "").includes("12") === true &&
    !(await shownNow("#medal-plate-stand-in")) &&
    !(await shownNow("#medal-plate-unavailable"));
  results.medalPlateOnAppSurface = await page.evaluate<boolean>(
    `(() => { const colours = []; for (let box = document.querySelector("#medal-plate"); box !== null; box = box.parentElement) { colours.push(getComputedStyle(box).backgroundColor); if (box.id === "medal") return !colours.includes("rgb(255, 204, 0)"); } return false; })()`,
  );
  const withMedalPlate = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.medalIdKeptOutOfDom =
    medalIds.every((id) => id.length === 48 && !withMedalPlate.includes(id)) &&
    medalIds[0] !== medalIds[1] &&
    !withMedalPlate.includes("tokenplate");
  medalPlatesPerRead.push(await readMedalShowing(() => shownNow("#medal-plate-image")));
  const collectingSrc = await medalPlateSrc();
  await fetch(`${HIROBA}/__medal?state=complete`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await medalPlateSrc()) !== collectingSrc),
  );
  const completeShown =
    (await textOf("#medal-complete")) === "COMPLETE" && (await textOf("#medal-count")) === null;
  const completeLayout = await medalLayout();
  results.medalPlateLaidOutAsOnHiroba =
    medalLaidOutAsOnHiroba(collectingLayout, "#medal-count-shown", 215) &&
    medalLaidOutAsOnHiroba(completeLayout, "#medal-complete", 190);
  await fetch(`${HIROBA}/__medal?state=collecting`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await medalPlateSrc()) === collectingSrc),
  );
  await fetch(`${HIROBA}/__medal?state=complete`);
  medalPlatesPerRead.push(
    await readMedalShowing(async () => (await textOf("#medal-complete")) !== null),
  );
  results.medalPlateOncePerIdAndState =
    completeShown &&
    same(
      medalPlatesPerRead.map((count) => count - medalPlatesBefore),
      [1, 2, 2, 3, 3, 3],
    );
  // Season 1 again, its plate kept for the reopen below; scrolled up for the title plate.
  await fetch(`${HIROBA}/__medal?state=collecting&season=1`);
  await readMedalShowing(() => shownNow("#medal-plate-image"));
  await page.evaluate("window.scrollTo(0, 0)");
}
