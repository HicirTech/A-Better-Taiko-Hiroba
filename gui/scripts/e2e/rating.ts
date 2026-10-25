/** Rating: from the kept scores and the rating data, which every refresh reads again. */
import { en, RATING_DATA } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { savedPicture, savedWhole } from "./snapshots";
import { hitsOn, refreshHits } from "./stand-in";

export const ratingKeys = [
  "ratingDataReadAsThePageFirstOpens",
  "ratingIsTheMedianOfTheBest",
  "ratingListsTheBestThenTheNext",
  "ratingRadarShowsTheSixSkills",
  "ratingRowOpensItsScoreDetails",
  "ratingReadAgainReadsTheDataAgain",
  "ratingShareSavesThePicture",
  "ratingSharePicture",
] as const;

const COUNTED = 20;
// Shown values are rounded to two decimals, the rating from the values before rounding.
const ROUNDING = 0.0101;

const median = (values: readonly number[]) => {
  const half = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? (values[half] ?? 0)
    : ((values[half - 1] ?? 0) + (values[half] ?? 0)) / 2;
};

const descending = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value <= (values[index - 1] ?? value));

export async function rating(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { attribute, exists, fabState, press } = pageHelpers(page);
  const values = (list: string) =>
    page.evaluate<number[]>(
      `[...document.querySelectorAll("#${list} .rating-value")].map((cell) => Number(cell.textContent))`,
    );

  // The scores section read every played chart; the data is read as the page first opens.
  const dataReads = await hitsOn(RATING_DATA);
  await goTo("rating");
  const total = Number(
    await waitFor("the rating", async () => (await textOf("#rating-total")) ?? undefined),
  );
  results.ratingDataReadAsThePageFirstOpens = (await hitsOn(RATING_DATA)) === dataReads + 1;

  const best = await values("rating-best");
  const next = await values("rating-next");
  results.ratingIsTheMedianOfTheBest = Math.abs(total - median(best)) <= ROUNDING;
  results.ratingListsTheBestThenTheNext =
    best.length > 0 &&
    best.length <= COUNTED &&
    next.length <= COUNTED &&
    (next.length === 0 || best.length === COUNTED) &&
    descending([...best, ...next]);

  const radar = (await attribute("#rating-radar", "aria-label")) ?? "";
  const skills = ["power", "stamina", "speed", "accuracy", "rhythm", "complex"] as const;
  results.ratingRadarShowsTheSixSkills = same(
    radar.split(", ").map((part) => part.replace(/ [\d.]+$/, "")),
    skills.map((skill) => en.t(`rating.figure.${skill}`)),
  );

  await click("#rating-best .song-open");
  const opened = await waitFor(
    "the score's details",
    async () => (await exists("#score-details-title")) || undefined,
  );
  await press("Escape");
  await waitFor("the details shut", async () =>
    (await exists("#score-details")) ? undefined : true,
  );
  results.ratingRowOpensItsScoreDetails = opened === true;

  // Read again reads the scores, after Hiroba's refresh, and the rating data again.
  const refreshes = await refreshHits();
  await click("#read-again");
  await waitFor("the data read again", async () =>
    (await hitsOn(RATING_DATA)) === dataReads + 2 ? true : undefined,
  );
  await waitFor("the read settled", async () =>
    same(await fabState(), { shut: false, spinning: false }) && !(await exists("#page-skeleton"))
      ? true
      : undefined,
  );
  results.ratingReadAgainReadsTheDataAgain =
    (await refreshHits()) > refreshes && (await exists("#rating-total"));

  const picture = await savedPicture(ctx, "rating-share", "abth-rating");
  results.ratingSharePicture = picture;
  results.ratingShareSavesThePicture = savedWhole(picture);
  await goTo("overview");
}
