/** A chart's own menu on Scores adds its song to a set on the device, or to a new one. */

import { LONG_PRESS_MS } from "../../src/ui/use-long-press";
import { en } from "./config";
import type { Ctx } from "./context";
import { middleOf, pageHelpers, same, waitFor } from "./harness";
import { requestLog, resetLog } from "./stand-in";

export const scoreSetsKeys = [
  "rightClickOffersOneAction",
  "chooserOpensWithANewSet",
  "rowMenuAddsToANewSet",
  "rowNewSetCancelGoesBackToTheChooser",
  "rowMenuMarksASetHoldingTheSong",
  "rowMenuAddsToTheEndOfASet",
  "rowMenuSendsNothingToHiroba",
  "rowMenuMarksAFullSet",
  "rowHeldOnAPhoneOffersTheSets",
] as const;

/** Where the app keeps the sets, as the Favourites page writes them. */
const SETS_KEY = "abth.favoriteSets";

interface KeptSet {
  readonly name: string;
  readonly songs: readonly string[];
}

/** A line of the add-to-set dialog: whether it is shut to a choice, and what it says. */
interface MenuLine {
  readonly refused: boolean;
  readonly text: string;
}

const isChart = (charted: string) => {
  const [songNo, level] = charted.split("/");
  return `(row) => row.dataset.songNo === "${songNo}" && row.dataset.level === "${level}"`;
};
const songOf = (charted: string) => charted.split("/")[0] ?? "";

export async function scoreSets(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page } = ctx.app;
  const { exists, listRows, mousePress, press, rowInView, touchEmulated } = pageHelpers(page);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const kept = () =>
    page.evaluate<KeptSet[]>(
      `(JSON.parse(localStorage.getItem(${JSON.stringify(SETS_KEY)}) ?? "{}").sets ?? []).map(({ name, songs }) => ({ name, songs }))`,
    );
  const charts = () =>
    listRows<string>("#scores-list", `(row) => row.dataset.songNo + "/" + row.dataset.level`);
  const rowOf = (charted: string) => rowInView("#scores-list", isChart(charted));
  // A right-click's menu holds one action, which opens the dialog.
  const openDialog = async (charted: string) => {
    await mousePress(await rowOf(charted), "right");
    await shown("#scores-row-menu");
    await click("#scores-row-menu-add");
    await shown("#scores-add-to-set");
  };
  const shutDialog = async () => {
    await press("Escape");
    await gone("#scores-add-to-set");
    await Bun.sleep(300);
  };
  const lineOf = (selector: string) =>
    page.evaluate<MenuLine | null>(
      `(() => { const line = document.querySelector(${JSON.stringify(selector)}); return line === null ? null : { refused: line.classList.contains("Mui-disabled"), text: line.textContent }; })()`,
    );
  const before = await page.evaluate<string | null>(
    `localStorage.getItem(${JSON.stringify(SETS_KEY)})`,
  );

  await goTo("scores");
  // Two charts of two songs, as the list shows them first.
  const [first, second] = await waitFor("charts of two songs", async () => {
    const [one, ...rest] = await charts();
    const other = rest.find((charted) => songOf(charted) !== songOf(one ?? ""));
    return one === undefined || other === undefined ? undefined : [one, other];
  });
  await resetLog();

  await mousePress(await rowOf(first), "right");
  await shown("#scores-row-menu");
  const actions = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#scores-row-menu [role=menuitem]")].map((item) => item.textContent)`,
  );
  await press("Escape");
  await gone("#scores-row-menu");
  await Bun.sleep(300);
  results.rightClickOffersOneAction = same(actions, [en.t("history.addToSet")]);

  // A new set comes first, and starts with the chart's song, named as Favourites names one.
  await openDialog(first);
  results.chooserOpensWithANewSet =
    (await page.evaluate<string | null>(
      `document.querySelector("#scores-add-to-set .MuiListItemButton-root")?.id ?? null`,
    )) === "scores-add-new-set";
  await click("#scores-add-new-set");
  await shown("#favorite-set-name-dialog");
  await press("Escape");
  await gone("#favorite-set-name-dialog");
  results.rowNewSetCancelGoesBackToTheChooser = await exists("#scores-add-to-set");
  await click("#scores-add-new-set");
  await shown("#favorite-set-name-dialog");
  await click("#favorite-set-name-save");
  await gone("#favorite-set-name-dialog");
  await gone("#scores-add-to-set");
  const sets = await kept();
  const index = sets.length - 1;
  results.rowMenuAddsToANewSet = same(sets[index]?.songs ?? [], [songOf(first)]);

  await openDialog(first);
  const holding = await lineOf(`#scores-add-set-${index}`);
  await shutDialog();
  results.rowMenuMarksASetHoldingTheSong =
    holding?.refused === true && holding.text.includes(en.t("history.setHolds"));

  await openDialog(second);
  await click(`#scores-add-set-${index}`);
  await gone("#scores-add-to-set");
  results.rowMenuAddsToTheEndOfASet = same((await kept())[index]?.songs ?? [], [
    songOf(first),
    songOf(second),
  ]);
  results.rowMenuSendsNothingToHiroba = (await requestLog()).length === 0;

  // A full set, kept as the Favourites page keeps one, is read as the page opens again.
  await page.evaluate(
    `(() => { const kept = JSON.parse(localStorage.getItem(${JSON.stringify(SETS_KEY)})); kept.sets.push({ id: "e2e-full", name: "Full", songs: Array.from({ length: 30 }, (_, at) => String(2000 + at)) }); localStorage.setItem(${JSON.stringify(SETS_KEY)}, JSON.stringify(kept)); })()`,
  );
  await goTo("overview");
  await goTo("scores");
  await waitFor(
    "the charts shown again",
    async () => (await exists("#scores-list li")) || undefined,
  );
  await openDialog(second);
  const full = await lineOf(`#scores-add-set-${index + 1}`);
  await shutDialog();
  results.rowMenuMarksAFullSet =
    full?.refused === true && full.text.includes(en.t("history.setFull", { count: "30" }));

  // A long press let go in place opens the dialog at once, and opens no details.
  await touchEmulated(true);
  try {
    const row = await rowOf(second);
    await page.evaluate(
      `document.querySelector(${JSON.stringify(row)}).scrollIntoView({ block: "center" })`,
    );
    await Bun.sleep(300);
    const at = await middleOf(page, row);
    await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
    await Bun.sleep(2 * LONG_PRESS_MS);
    await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await shown("#scores-add-to-set");
    await Bun.sleep(500);
    const offered =
      (await exists(`#scores-add-set-${index}`)) && (await exists("#scores-add-new-set"));
    const menuOpened = await exists("#scores-row-menu");
    const detailsOpened = await exists("#score-details");
    await shutDialog();
    results.rowHeldOnAPhoneOffersTheSets = offered && !menuOpened && !detailsOpened;
  } finally {
    await touchEmulated(false);
  }

  await page.evaluate(
    before === null
      ? `localStorage.removeItem(${JSON.stringify(SETS_KEY)})`
      : `localStorage.setItem(${JSON.stringify(SETS_KEY)}, ${JSON.stringify(before)})`,
  );
  await goTo("overview");
}
