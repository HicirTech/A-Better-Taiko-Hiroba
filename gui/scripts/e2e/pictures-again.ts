/** A long hold reads a page's pictures again from Hiroba, after a question: three pages. */
import { LONG_HOLD_MS } from "../../src/ui/pull-gesture";
import { HIROBA, PAGE_SIZE, PANEL_ART } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import {
  hitsOn,
  ICON_PATHS,
  iconsSettled,
  medalPlatesSettled,
  myDonsSettled,
  platesSettled,
  thumbsSettled,
} from "./stand-in";

/** Tall enough for the whole Overview, so every picture of it is on screen. */
const WHOLE_OVERVIEW_PX = 1800;

export const picturesAgainKeys = [
  "pictureHoldAsksFirst",
  "pictureHoldCancelledReadsNothing",
  "overviewPicturesReadAgain",
  "pictureNotComeStaysAndSaysSo",
  "costumePicturesReadAgain",
  "titlePlateReadAgain",
] as const;

/** How often the stand-in was asked for each of my page's pictures, once the asking settled. */
const myPagePictures = async () => ({
  plates: (await platesSettled()).length,
  myDons: await myDonsSettled(),
  panels: await hitsOn(PANEL_ART),
  medals: await medalPlatesSettled(),
  icons: await iconsSettled(),
});

export async function picturesAgain(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page } = ctx.app;
  const { atSize, attribute, exists, mousePress } = pageHelpers(page);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => !(await exists(selector)) || undefined);
  const readAgainHeld = async () => {
    await mousePress("#read-again", "left", LONG_HOLD_MS + 500);
    await shown("#read-pictures");
  };
  // How the note at the window's foot said it ended; it leaves on its own before the next.
  const confirmed = async () => {
    await click("#read-pictures-confirm");
    await gone("#read-pictures");
    const said = await waitFor(
      "the pictures' note",
      async () => (await attribute("#pictures-read-again", "data-outcome")) ?? undefined,
    );
    await gone("#pictures-read-again");
    return said;
  };

  await goTo("overview");
  await atSize(PAGE_SIZE.width, WHOLE_OVERVIEW_PX, async () => {
    const before = await myPagePictures();
    await readAgainHeld();
    const whileAsked = await myPagePictures();
    await click("#read-pictures-cancel");
    await gone("#read-pictures");
    results.pictureHoldAsksFirst = same(whileAsked, before);
    results.pictureHoldCancelledReadsNothing = same(await myPagePictures(), before);

    await readAgainHeld();
    const said = await confirmed();
    const after = await myPagePictures();
    results.overviewPicturesReadAgain =
      said === "read" &&
      same(after, {
        plates: before.plates + 1,
        myDons: before.myDons + 1,
        panels: before.panels + 1,
        medals: before.medals + 1,
        icons: before.icons + ICON_PATHS.length,
      });

    // The どんメダル plate Hiroba does not send keeps the one kept, and the note says so.
    const medalShown = await attribute("#medal-plate-image", "src");
    await fetch(`${HIROBA}/__tokenplate?answer=gif`);
    await readAgainHeld();
    const failedSaid = await confirmed();
    results.pictureNotComeStaysAndSaysSo =
      failedSaid === "failed" &&
      medalShown !== null &&
      (await attribute("#medal-plate-image", "src")) === medalShown;
    await fetch(`${HIROBA}/__tokenplate?answer=png`);
  });

  // The items on screen, each asked for once more, none asked for the first time.
  await goTo("costume");
  await shown("#costume-bar");
  const thumbsBefore = await thumbsSettled();
  await readAgainHeld();
  const costumeSaid = await confirmed();
  const thumbsAfter = await thumbsSettled();
  const askedAgain = thumbsAfter
    .slice(thumbsBefore.length)
    .map(({ cos, type }) => `${type}/${cos}`);
  const askedBefore = new Set(thumbsBefore.map(({ cos, type }) => `${type}/${cos}`));
  results.costumePicturesReadAgain =
    costumeSaid === "read" &&
    askedAgain.length > 0 &&
    new Set(askedAgain).size === askedAgain.length &&
    askedAgain.every((item) => askedBefore.has(item));

  await goTo("nameTitle");
  await shown("#name-title-page");
  const platesBefore = (await platesSettled()).length;
  await readAgainHeld();
  const titleSaid = await confirmed();
  results.titlePlateReadAgain =
    titleSaid === "read" && (await platesSettled()).length === platesBefore + 1;
}
