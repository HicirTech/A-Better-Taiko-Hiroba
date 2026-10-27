/** Rating: from the kept scores and the rating data, which every refresh reads again. */
import { en, RATING_DATA, RATING_DATA_V2 } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { savedPicture, savedWhole } from "./snapshots";
import { hitsOn, refreshHits } from "./stand-in";

export const ratingKeys = [
  "ratingDataReadAsThePageFirstOpens",
  "ratingOpensOnV1",
  "ratingIsTheMedianOfTheBest",
  "ratingListsTheBestThenTheNext",
  "ratingRadarShowsTheSixSkills",
  "ratingRowOpensItsScoreDetails",
  "ratingReadAgainReadsTheDataAgain",
  "ratingShareSavesThePicture",
  "ratingSharePicture",
  "ratingV2ReadAsItIsShown",
  "ratingV2RadarShowsItsSixSkills",
  "ratingV2IsThePeakWeightedBest",
  "ratingV2RatesHardCharts",
  "ratingReadAgainReadsTheShownData",
  "ratingV2ShareSavesThePicture",
  "ratingV2SharePicture",
  "ratingBackOnV1AfterLeaving",
  "settingsRatingOpensRatingOnIt",
] as const;

const COUNTED = 20;
// Shown values are rounded to two decimals, the rating from the values before rounding.
const ROUNDING = 0.0101;
/** V2 weighs a figure's best 20 charts to peak at places 10 and 11. */
const PEAK_WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const V1_SKILLS = ["power", "stamina", "speed", "accuracy", "rhythm", "complex"] as const;
const V2_SKILLS = ["stamina", "speed", "burst", "accuracy", "rhythm", "complex"] as const;
const HARD = 3;

type Skill = (typeof V1_SKILLS)[number] | (typeof V2_SKILLS)[number];

const median = (values: readonly number[]) => {
  const half = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? (values[half] ?? 0)
    : ((values[half - 1] ?? 0) + (values[half] ?? 0)) / 2;
};

const peakWeighted = (values: readonly number[]) => {
  const weights = PEAK_WEIGHTS.slice(0, values.length);
  const sum = weights.reduce((total, weight, at) => total + weight * (values[at] ?? 0), 0);
  return sum / weights.reduce((total, weight) => total + weight, 0);
};

const descending = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value <= (values[index - 1] ?? value));

const skillNames = (skills: readonly Skill[]) =>
  skills.map((skill) => en.t(`rating.figure.${skill}`));

export async function rating(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { attribute, exists, fabState, press } = pageHelpers(page);
  const values = (list: string) =>
    page.evaluate<number[]>(
      `[...document.querySelectorAll("#${list} .rating-value")].map((cell) => Number(cell.textContent))`,
    );
  const radarNames = async () =>
    ((await attribute("#rating-radar", "aria-label")) ?? "")
      .split(", ")
      .map((part) => part.replace(/ [\d.]+$/, ""));
  const shows = async (system: string) =>
    (await attribute(`#rating-system-${system}`, "aria-pressed")) === "true";
  const totalShown = () =>
    waitFor("the rating", async () => (await textOf("#rating-total")) ?? undefined);
  const settled = () =>
    waitFor("the read settled", async () =>
      same(await fabState(), { shut: false, spinning: false }) && !(await exists("#page-skeleton"))
        ? true
        : undefined,
    );

  // The scores section read every played chart; the data is read as the page first opens.
  const dataReads = await hitsOn(RATING_DATA);
  await goTo("rating");
  const total = Number(await totalShown());
  results.ratingDataReadAsThePageFirstOpens = (await hitsOn(RATING_DATA)) === dataReads + 1;
  results.ratingOpensOnV1 = (await shows("ourtaikoV1")) && !(await shows("ourtaikoV2"));

  const best = await values("rating-best");
  const next = await values("rating-next");
  results.ratingIsTheMedianOfTheBest = Math.abs(total - median(best)) <= ROUNDING;
  results.ratingListsTheBestThenTheNext =
    best.length > 0 &&
    best.length <= COUNTED &&
    next.length <= COUNTED &&
    (next.length === 0 || best.length === COUNTED) &&
    descending([...best, ...next]);
  results.ratingRadarShowsTheSixSkills = same(await radarNames(), skillNames(V1_SKILLS));

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
  await settled();
  results.ratingReadAgainReadsTheDataAgain =
    (await refreshHits()) > refreshes && (await exists("#rating-total"));

  const picture = await savedPicture(ctx, "rating-share", "abth-rating");
  results.ratingSharePicture = picture;
  results.ratingShareSavesThePicture = savedWhole(picture);

  // The switch shows V2 for the visit, its data read the first time it is shown.
  const v2Reads = await hitsOn(RATING_DATA_V2);
  await click("#rating-system-ourtaikoV2");
  await waitFor("V2's radar", async () =>
    same(await radarNames(), skillNames(V2_SKILLS)) ? true : undefined,
  );
  await settled();
  results.ratingV2ReadAsItIsShown = (await hitsOn(RATING_DATA_V2)) === v2Reads + 1;
  results.ratingV2RadarShowsItsSixSkills =
    same(await radarNames(), skillNames(V2_SKILLS)) &&
    (await shows("ourtaikoV2")) &&
    !(await shows("ourtaikoV1"));
  const v2Best = await values("rating-best");
  // The stand-in's charts sit far under 14, where V2 raises a figure toward the top.
  results.ratingV2IsThePeakWeightedBest =
    v2Best.length > 0 && Math.abs(Number(await totalShown()) - peakWeighted(v2Best)) <= ROUNDING;
  results.ratingV2RatesHardCharts = await page.evaluate<boolean>(
    `[...document.querySelectorAll("#rating-best [data-level], #rating-next [data-level]")].some((row) => row.getAttribute("data-level") === "${HARD}")`,
  );

  // Under V2, Read again reads V2's data and leaves V1's.
  const v1Reads = await hitsOn(RATING_DATA);
  await click("#read-again");
  await waitFor("V2's data read again", async () =>
    (await hitsOn(RATING_DATA_V2)) === v2Reads + 2 ? true : undefined,
  );
  await settled();
  results.ratingReadAgainReadsTheShownData = (await hitsOn(RATING_DATA)) === v1Reads;

  const v2Picture = await savedPicture(ctx, "rating-share", "abth-rating");
  results.ratingV2SharePicture = v2Picture;
  results.ratingV2ShareSavesThePicture = savedWhole(v2Picture);

  // Leaving the page drops the switch: Rating opens on Settings' default again.
  await goTo("overview");
  await goTo("rating");
  await totalShown();
  results.ratingBackOnV1AfterLeaving =
    (await shows("ourtaikoV1")) && same(await radarNames(), skillNames(V1_SKILLS));

  // Settings' default opens Rating on it; then back as the run found it.
  await goTo("settings");
  await click("#starting-rating-ourtaikoV2");
  await goTo("rating");
  await waitFor("V2 shown", async () => ((await shows("ourtaikoV2")) ? true : undefined));
  results.settingsRatingOpensRatingOnIt = same(await radarNames(), skillNames(V2_SKILLS));
  await goTo("settings");
  await click("#starting-rating-ourtaikoV1");
  await goTo("overview");
}
