/** Know yourself: folded parts that each sum up what they find, asking Hiroba nothing. */
import { en } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { requestLog, resetLog } from "./stand-in";

export const knowYourselfKeys = [
  "knowYourselfAsksHirobaNothing",
  "pagesStartOnTheSettingsDifficulty",
  "partsStartFoldedWithASummary",
  "ladderCountsUnplayedCharts",
  "ladderRowOpensItsChartsNotCleared",
  "gapListNarrowsToNeverPlayed",
  "nearestGapsGoToANewSet",
  "knowNewSetCancelGoesBackToTheChooser",
  "setHoldingTheTickedSongsIsRefused",
  "rankRowsOpenNothing",
  "bpmBandsAWobblingTempoByItsNumber",
  "nearMissSummaryCountsItsList",
  "nearMissOpensItsScoreDetails",
] as const;

const SETS_KEY = "abth.favoriteSets";
const SET_SONG_LIMIT = 30;
const PARTS = ["crowns", "ranks", "per-second", "bpm", "full-combo", "donderful"] as const;
// The stand-in's song 1010 wobbles about 168; 1005 runs from 120 to 240.
const WOBBLING_BAND = "#know-bpm-rows-band-160";
const CHANGING_ROW = "#know-bpm-rows-changing";

/** Pictures and the stand-in's own data feeds: anything else is a request to Hiroba. */
const isHirobaPage = (line: string) => !/\.(png|gif|jpe?g)$/.test(line) && !line.includes(" /__");

export async function knowYourself(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { attribute, exists, press } = pageHelpers(page);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const unfold = async (part: string) => {
    await click(`#know-${part}-header`);
    await shown(`#know-${part}-content`);
  };
  const totalOf = async (row: string) => Number(await textOf(`${row}-total`));
  const rowTotals = (rows: string) =>
    page.evaluate<number[]>(
      `[...document.querySelectorAll('[id^="${rows}-"][id$="-total"]')].filter((cell) => !cell.id.startsWith("${rows}-all-")).map((cell) => Number(cell.textContent))`,
    );
  const notesIn = (list: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#${list} li .chart-note")].map((note) => note.textContent)`,
    );
  const songsIn = (list: string) =>
    page.evaluate<string[]>(
      `[...new Set([...document.querySelectorAll("#${list} li[data-song-no]")].map((row) => row.dataset.songNo))]`,
    );
  const kept = () =>
    page.evaluate<{ name: string; songs: string[] }[]>(
      `(JSON.parse(localStorage.getItem(${JSON.stringify(SETS_KEY)}) ?? "{}").sets ?? []).map(({ name, songs }) => ({ name, songs }))`,
    );
  const before = await page.evaluate<string | null>(
    `localStorage.getItem(${JSON.stringify(SETS_KEY)})`,
  );

  // Hard in Settings: both pages start on it, and Extreme comes back after.
  await goTo("settings");
  await click("#shown-difficulty-hard");
  await goTo("scores");
  await shown("#scores-difficulty");
  const scoresChip = await textOf("#scores-difficulty");
  await resetLog();
  await goTo("knowYourself");
  await shown("#know-crowns");
  const knowChip = await textOf("#know-difficulty");
  await goTo("settings");
  await click("#shown-difficulty-oni");
  results.pagesStartOnTheSettingsDifficulty =
    scoresChip === en.t("difficulty.hard") && knowChip === en.t("difficulty.hard");

  await goTo("knowYourself");
  await shown("#know-crowns");
  const folded = await Promise.all(
    PARTS.map(async (part) => ({
      shut: !(await exists(`#know-${part}-content`)),
      summary: (await textOf(`#know-${part}-summary`)) ?? "",
    })),
  );
  const wall = (await textOf("#know-crowns-summary")) ?? "";
  results.partsStartFoldedWithASummary =
    folded.every(({ shut, summary }) => shut && summary.length > 0) &&
    (wall === en.t("know.noWall") || wall.startsWith("Your wall is ★"));

  await unfold("crowns");
  results.ladderCountsUnplayedCharts =
    (await textOf("#know-difficulty")) === en.t("difficulty.oni") &&
    (await totalOf("#know-crowns-rows-all")) ===
      (await rowTotals("know-crowns-rows")).reduce((sum, total) => sum + total, 0) &&
    ((await attribute("#know-crowns-rows-all-bar", "aria-label")) ?? "").includes(
      en.t("know.never"),
    );

  // The All row opens every chart not cleared yet, which a chip narrows to those never played.
  const GAPS = "know-crowns-rows-all-gaps";
  await click("#know-crowns-rows-all");
  await shown(`#${GAPS} li`);
  const notes = await notesIn(GAPS);
  const gapNotes = [en.t("know.never"), en.t("know.tried")];
  results.ladderRowOpensItsChartsNotCleared =
    (await attribute("#know-crowns-rows-all", "aria-expanded")) === "true" &&
    notes.length > 0 &&
    notes.every((note) => gapNotes.includes(note));
  await click(`#${GAPS}-never`);
  await Bun.sleep(300);
  const never = await notesIn(GAPS);
  await click(`#${GAPS}-never`);
  await Bun.sleep(300);
  results.gapListNarrowsToNeverPlayed =
    never.length > 0 &&
    never.length < notes.length &&
    never.every((note) => note === en.t("know.never")) &&
    (await notesIn(GAPS)).length === notes.length;

  // The nearest songs make a new set, named as the Favourites page names one.
  const nearest = (await songsIn(GAPS)).slice(0, SET_SONG_LIMIT);
  await click(`#${GAPS}-add-nearest`);
  await shown("#know-add-to-set");
  await click("#know-add-new-set");
  await shown("#favorite-set-name-dialog");
  await press("Escape");
  await gone("#favorite-set-name-dialog");
  results.knowNewSetCancelGoesBackToTheChooser = await exists("#know-add-to-set");
  await click("#know-add-new-set");
  await shown("#favorite-set-name-dialog");
  await click("#favorite-set-name-save");
  await gone("#favorite-set-name-dialog");
  await gone("#know-add-to-set");
  const sets = await kept();
  const index = sets.length - 1;
  results.nearestGapsGoToANewSet = nearest.length > 0 && same(sets[index]?.songs ?? [], nearest);

  // The new set holds the ticked song already: the dialog offers it no more.
  await click(`#${GAPS} li input[type=checkbox]`);
  await click(`#${GAPS}-add-ticked`);
  await shown("#know-add-to-set");
  const holding = await page.evaluate<{ refused: boolean; text: string } | null>(
    `(() => { const line = document.querySelector("#know-add-set-${index}"); return line === null ? null : { refused: line.classList.contains("Mui-disabled"), text: line.textContent }; })()`,
  );
  await press("Escape");
  await gone("#know-add-to-set");
  await Bun.sleep(300);
  results.setHoldingTheTickedSongsIsRefused =
    holding?.refused === true && holding.text.includes(en.t("know.setHoldsAll"));

  await unfold("ranks");
  await shown("#know-ranks-rows-legend-rank-none");
  results.rankRowsOpenNothing = !(await exists("#know-ranks-content [aria-expanded]"));

  await unfold("bpm");
  await shown(CHANGING_ROW);
  results.bpmBandsAWobblingTempoByItsNumber =
    (await exists(WOBBLING_BAND)) && (await textOf(WOBBLING_BAND))?.startsWith("160–179") === true;

  await unfold("full-combo");
  await shown("#know-full-combo-list li");
  const misses = await notesIn("know-full-combo-list");
  results.nearMissSummaryCountsItsList =
    misses.length > 0 &&
    misses.every((note) => /^Bad \d+$/.test(note ?? "")) &&
    (await textOf("#know-full-combo-summary")) ===
      en.t("know.almost.fullCombo.count", { count: String(misses.length) });
  await click("#know-full-combo-list li .song-open");
  const opened = await waitFor(
    "the near miss's details",
    async () => (await exists("#score-details-title")) || undefined,
  );
  await press("Escape");
  await gone("#score-details");
  results.nearMissOpensItsScoreDetails = opened === true;

  results.knowYourselfAsksHirobaNothing = (await requestLog()).filter(isHirobaPage).length === 0;

  await page.evaluate(
    before === null
      ? `localStorage.removeItem(${JSON.stringify(SETS_KEY)})`
      : `localStorage.setItem(${JSON.stringify(SETS_KEY)}, ${JSON.stringify(before)})`,
  );
  await goTo("overview");
}
