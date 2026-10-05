import { TITLE_PLATE } from "../mock-pictures";
import type { App } from "./app";
import { MY_DON_GIF_CODE, PANEL_ART } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor, waitForSeen, withoutPictureBytes } from "./harness";
import { hitsOn, ICON_PATHS, iconHits, myDonsSettled, myPageHits, platesSettled } from "./stand-in";

export type Share = readonly [name: string, percent: string, count: number];
export const RANK_SHARES: readonly Share[] = [
  ["White Iki", "3.9%", 4],
  ["Bronze Iki", "8.8%", 9],
  ["Silver Iki", "17.6%", 18],
  ["Gold Miyabi", "30.4%", 31],
  ["Pink Miyabi", "24.5%", 25],
  ["Purple Miyabi", "11.8%", 12],
  ["Rainbow Kiwami", "2.9%", 3],
];
export const CROWN_SHARES: readonly Share[] = [
  ["Clear", "78.6%", 11],
  ["Full Combo", "14.3%", 2],
  ["Donderful Combo", "7.1%", 1],
];
export const legendOf = (shares: readonly Share[], total: number) =>
  shares.map(([, percent, count]) => `${percent} ${count} of ${total}`);
export const namesOf = (shares: readonly Share[]) =>
  shares.map(([name, percent]) => `${name} ${percent}`);
export const barOf = (shares: readonly Share[], total: number) =>
  shares.map(([name, , count]) => `${name}: ${count} of ${total}`);

const PANEL_WIDTH_UNITS = 280;
type PanelCount = readonly [id: string, name: string, count: string, left: number, top: number];

export const PANEL_COUNTS: readonly PanelCount[] = [
  ["rank-8", "Rainbow Kiwami", "3", 230, 18],
  ["rank-5", "Gold Miyabi", "31", 57, 54],
  ["rank-6", "Pink Miyabi", "25", 141, 54],
  ["rank-7", "Purple Miyabi", "12", 230, 54],
  ["rank-2", "White Iki", "4", 57, 85],
  ["rank-3", "Bronze Iki", "9", 141, 85],
  ["rank-4", "Silver Iki", "18", 230, 85],
  ["crowns-silver", "Clear", "11", 57, 121],
  ["crowns-gold", "Full Combo", "2", 141, 121],
  ["crowns-donderful", "Donderful Combo", "1", 230, 121],
];

export function overviewHelpers(app: App) {
  const { page, textOf } = app;
  const { allOf, boxOf } = pageHelpers(page);

  const lastUpdated = async () => ({
    text: (await textOf("#last-updated")) ?? "",
    fontSize: await page.evaluate<string>(
      `getComputedStyle(document.querySelector("#last-updated")).fontSize`,
    ),
  });

  const legendPictures = (app: App) =>
    app.page.evaluate<{ images: number; dots: number }>(
      `(() => { const items = [...document.querySelectorAll("#ranks li, #crowns li")]; return { images: items.filter((item) => item.querySelector("img") !== null).length, dots: items.filter((item) => item.querySelector('[aria-hidden="true"] > span') !== null).length }; })()`,
    );
  const legendIconsShownOn = (app: App) =>
    waitForSeen("legend icons", app.page, async () =>
      (await legendPictures(app)).images === ICON_PATHS.length ? true : undefined,
    );

  const headerBoxes = async () => ({
    myDon: await boxOf("#my-don"),
    plate: await boxOf("#title-plate"),
    panel: await boxOf("#score-panel"),
  });

  const settledHeader = async () => {
    let before = "";
    return waitFor("steady header", async () => {
      const now = await headerBoxes();
      const shown = JSON.stringify(now);
      const steady = shown === before;
      before = shown;
      return steady ? now : undefined;
    });
  };
  /** Whether, at `width`, the tile is a square from the plate's top to the panel's bottom. */
  const tileAlignedAt = async (width: number) => {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 0,
      mobile: false,
    });
    const { myDon, plate, panel } = await settledHeader();
    await page.send("Emulation.clearDeviceMetricsOverride", {});
    // The checks after this one measure the panel, so it settles back at the window's own size.
    await settledHeader();
    return (
      myDon.right <= plate.left &&
      Math.abs(myDon.top - plate.top) <= 1 &&
      Math.abs(myDon.bottom - panel.bottom) <= 1 &&
      Math.abs(myDon.width - (myDon.bottom - myDon.top)) <= 1
    );
  };

  const panelCountsInPlace = async (counts: readonly PanelCount[]) => {
    const panel = await boxOf("#score-panel");
    const unit = panel.width / PANEL_WIDTH_UNITS;
    const placed: boolean[] = [];
    for (const [id, , , left, top] of counts) {
      const count = await boxOf(`#score-panel-${id}`);
      placed.push(
        Math.abs((count.left - panel.left) / unit - left) < 1 &&
          Math.abs((count.top - panel.top) / unit - top) < 1,
      );
    }
    return (
      placed.every(Boolean) &&
      same(
        await allOf("#score-panel dt", "textContent"),
        counts.map(([, name]) => name),
      ) &&
      same(
        await allOf("#score-panel dd", "textContent"),
        counts.map(([, , count]) => count),
      ) &&
      same(
        await page.evaluate<string[]>(
          `[...document.querySelectorAll("#score-panel dd")].map((count) => count.id)`,
        ),
        counts.map(([id]) => `score-panel-${id}`),
      )
    );
  };

  return {
    lastUpdated,
    legendPictures,
    legendIconsShownOn,
    headerBoxes,
    tileAlignedAt,
    panelCountsInPlace,
  };
}

export const overviewKeys = [
  "profileShown",
  "panelSharesShown",
  "panelBlocksShown",
  "tokenInRendererDom",
  "danShownByName",
  "regionLeftOffCard",
  "taikoNoAndUrlsKeptOutOfDom",
  "readsAfterSignIn",
  "legendFallsBackToDots",
  "plateDrawnUnderTitle",
  "plateOnAppSurface",
  "danLabelShownAsPicture",
  "overviewShapedLikeMyPage",
  "overviewBlocksHaveNoBorders",
  "myDonAlignedWithTheColumn",
  "scorePanelMissingStandsIn",
  "headerAddressesKeptOutOfDom",
] as const;

export async function overview(ctx: Ctx) {
  const running = ctx.app;
  const { results, state, tokens } = ctx;
  const { page, text, textOf } = running;
  const { allOf, attribute, boxOf, exists } = pageHelpers(page);
  const { headerBoxes, lastUpdated, legendPictures, panelCountsInPlace, tileAlignedAt } =
    overviewHelpers(running);

  results.profileShown = (await textOf("#crowns-silver")) === "11 of 14";

  results.panelSharesShown =
    same(await allOf("#ranks li", "textContent"), legendOf(RANK_SHARES, 102)) &&
    same(await allOf("#crowns li", "textContent"), legendOf(CROWN_SHARES, 14)) &&
    same(await allOf("#ranks li", "ariaLabel"), namesOf(RANK_SHARES)) &&
    same(await allOf("#crowns li", "ariaLabel"), namesOf(CROWN_SHARES)) &&
    same(await allOf("#ranks-bar > *", "title"), barOf(RANK_SHARES, 102)) &&
    same(await allOf("#crowns-bar > *", "title"), barOf(CROWN_SHARES, 14)) &&
    (await textOf("#rank-5-percent")) === "30.4%";
  results.panelBlocksShown =
    same(await allOf("#panel h2", "textContent"), ["Score ranks", "Crowns"]) &&
    (await page.evaluate<boolean>(
      `document.querySelector("#panel-footnote") === null && ["#ranks-bar", "#crowns-bar"].every((bar) => document.querySelector(bar)?.getAttribute("aria-hidden") === "true")`,
    ));

  const updatedOnOverview = await lastUpdated();
  state.updatedOnOverview = updatedOnOverview;
  const rendered = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.tokenInRendererDom = rendered.includes(tokens[0] ?? "?");
  results.danShownByName =
    (await textOf("#dan")) === "Dan-i: 9th Dan" && (await textOf("#dan-unreadable")) === null;
  results.regionLeftOffCard =
    (await textOf("#region")) === null && !(await text()).includes("Region");
  results.taikoNoAndUrlsKeptOutOfDom =
    !rendered.includes("000000000000") && !rendered.includes("imgsrc");
  results.readsAfterSignIn = await myPageHits();

  await waitForSeen("legend icon requests", page, async () =>
    (await iconHits()) === ICON_PATHS.length ? true : undefined,
  );
  results.legendFallsBackToDots =
    same(await legendPictures(running), { images: 0, dots: ICON_PATHS.length }) &&
    same(await allOf("#ranks li", "ariaLabel"), namesOf(RANK_SHARES)) &&
    same(await allOf("#crowns li", "ariaLabel"), namesOf(CROWN_SHARES)) &&
    (await textOf("#rank-5-percent")) === "30.4%";

  await waitForSeen(
    "title plate picture",
    page,
    async () => (await attribute("#title-plate-image", "src")) ?? undefined,
  );
  await waitForSeen(
    "pictures code",
    page,
    async () => (await textOf("#pictures-code")) ?? undefined,
  );

  const myDonFailureAtSignIn =
    (await myDonsSettled()) === 1 &&
    !(await exists("#my-don-image")) &&
    (await attribute("#my-don", "aria-busy")) === "false" &&
    (await exists("#title-plate-image")) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  state.myDonFailureAtSignIn = myDonFailureAtSignIn;
  const plateBox = await page.evaluate<{ width: number; height: number }>(
    `(() => { const box = document.querySelector("#title-plate").getBoundingClientRect(); return { width: box.width, height: box.height }; })()`,
  );
  results.plateDrawnUnderTitle =
    (await attribute("#title-plate-image", "src"))?.startsWith("data:image/png;base64,") === true &&
    Math.abs(plateBox.width / plateBox.height - TITLE_PLATE.width / TITLE_PLATE.height) < 0.05 &&
    (await textOf("#profile-title")) === "Title: サンプルの称号" &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    (await textOf("#dan")) === "Dan-i: 9th Dan" &&
    (await textOf("#title-plate-stand-in")) === null &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  results.plateOnAppSurface = await page.evaluate<boolean>(
    `(() => { const colours = []; for (let box = document.querySelector("#title-plate"); box !== null; box = box.parentElement) { colours.push(getComputedStyle(box).backgroundColor); if (box.id === "profile") return !colours.includes("rgb(255, 204, 0)"); } return false; })()`,
  );
  results.danLabelShownAsPicture =
    (await attribute("#dan-label", "src"))?.startsWith("data:image/png;base64,") === true;

  const wide = await headerBoxes();
  const plainSurface = await page.evaluate<boolean>(
    `(() => { for (let box = document.querySelector("#overview-header"); box !== null && box.id !== "profile"; box = box.parentElement) { const style = getComputedStyle(box); if (style.backgroundColor === "rgb(255, 204, 0)" || style.backgroundImage !== "none") return false; } return true; })()`,
  );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 800,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await waitFor("drawer button", async () => (await exists("#nav-menu")) || undefined);
  const narrow = await headerBoxes();
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  await waitFor("side panel", async () => (await exists("#nav-overview")) || undefined);
  // On a narrow window the plate's empty top tucks under the portrait: the stand-in's tab is the
  // first thing it draws there.
  const narrowPlateDrawn =
    narrow.plate.top + (narrow.plate.height * TITLE_PLATE.tabTop) / TITLE_PLATE.height;
  results.overviewShapedLikeMyPage =
    wide.myDon.right <= wide.plate.left &&
    Math.abs(wide.myDon.top - wide.plate.top) < 1 &&
    wide.plate.bottom <= wide.panel.top &&
    wide.panel.left > wide.myDon.right &&
    narrow.myDon.bottom <= narrowPlateDrawn &&
    narrow.plate.bottom <= narrow.panel.top &&
    Math.abs(narrow.myDon.left + narrow.myDon.right - narrow.plate.left - narrow.plate.right) < 2 &&
    plainSurface;
  const framed = await page.evaluate<boolean>(
    `(() => { const sides = ["Top", "Right", "Bottom", "Left"]; return ["#profile", "#panel", "#medal"].some((selector) => { const block = document.querySelector(selector); const style = getComputedStyle(block); return block.closest(".MuiPaper-root") !== null || style.boxShadow !== "none" || sides.some((side) => style["border" + side + "Style"] !== "none" && parseFloat(style["border" + side + "Width"]) > 0); }); })()`,
  );
  const blocks = await Promise.all(["#profile", "#ranks", "#crowns", "#medal"].map(boxOf));
  const gaps = blocks.slice(1).map((block, index) => block.top - (blocks[index]?.bottom ?? 0));
  results.overviewBlocksHaveNoBorders =
    !framed && gaps.every((gap) => gap >= 16 && Math.abs(gap - (gaps[0] ?? 0)) < 1);

  results.myDonAlignedWithTheColumn = (await tileAlignedAt(1400)) && (await tileAlignedAt(700));

  results.scorePanelMissingStandsIn =
    (await hitsOn(PANEL_ART)) === 1 &&
    (await exists("#score-panel-stand-in")) &&
    !(await exists("#score-panel-image")) &&
    (await attribute("#score-panel", "aria-busy")) === "false" &&
    (await attribute("#score-panel", "role")) === "group" &&
    (await attribute("#score-panel", "aria-label")) === "Score panel" &&
    same(
      await page.evaluate<string[]>(
        `[...document.querySelectorAll("#score-panel dt")].slice(0, 7).map((name) => name.lang)`,
      ),
      Array(7).fill(""),
    ) &&
    (await panelCountsInPlace(PANEL_COUNTS)) &&
    (await textOf("#pictures-code")) === MY_DON_GIF_CODE;
  const withPlate = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.headerAddressesKeptOutOfDom =
    !withPlate.includes("imgsrc") &&
    !withPlate.includes("titleplate") &&
    !withPlate.includes("taiko_no") &&
    !withPlate.includes("total_score") &&
    !withPlate.includes("000000000000") &&
    !withPlate.includes("_token_v2") &&
    !tokens.some((token) => withPlate.includes(token));
  const platesAtSignIn = await platesSettled();
  state.platesAtSignIn = platesAtSignIn;
}
