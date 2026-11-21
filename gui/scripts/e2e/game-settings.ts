/** The Game settings page: Hiroba's settings read as it opens, changed, and synced in one write. */
import { CONTROL } from "../mock-controls";
import { BAD_VALUE_MESSAGE } from "../mock-game-settings";
import { INITIAL_GAME_SETTINGS } from "../mock-game-settings-lists";
import { en, HIROBA } from "./config";
import type { Ctx, LaneSection } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import {
  GAME_SETTINGS_PAGE,
  GAME_SETTINGS_POST_FIELDS,
  GAME_SETTINGS_REQUESTS,
  GAME_SETTINGS_SAVE,
  GAME_SETTINGS_START,
  gameSettingsNow,
  gameSettingsPosts,
  REFRESH,
  requestLog,
  requestsSettled,
  resetLog,
  sameBesideLanePictures,
} from "./stand-in";

const READ = `GET ${GAME_SETTINGS_PAGE}`;
/** The stars the folder's Easy cannot take, which Hiroba's page shuts. */
const PAST_EASY = ["6", "7", "8", "9", "10"];

const gameSettingsKeys = [
  "gameSettingsReadAsThePageOpens",
  "gameSettingsShowHirobasValues",
  "gameSettingsSyncWritesOnceAndReadsBack",
  "gameSettingsPostIsTheSitesShape",
  "gameSettingsSuccessSaysNothing",
  "gameSettingsRefusalSaysHirobasWords",
  "gameSettingsStarsFollowTheDifficulty",
  "gameSettingsEditsDroppedOnLeaving",
  "gameSettingsReadAgainRefreshesThenReads",
  "gameSettingsLockedDoubleChartsShut",
  "gameSettingsSessionGoneAfterSave",
] as const;

async function gameSettings(ctx: Ctx) {
  const { results, tokens } = ctx;
  const { click, goTo, page, textOf, until } = ctx.app;
  const { attribute, exists, mousePress, press, shown } = pageHelpers(page);
  const stepIs = (step: string) =>
    waitFor(`game settings ${step}`, async () =>
      (await page.evaluate<string | null>(
        `document.querySelector("#game-settings-page")?.dataset.step ?? null`,
      )) === step
        ? true
        : undefined,
    );
  /** Whether the page's Sync to Hiroba is shut, or not there at all. */
  const syncShut = () =>
    page.evaluate<boolean>(`document.querySelector("#game-settings-save")?.disabled !== false`);
  const syncLit = () =>
    waitFor("Sync to Hiroba lit", async () => ((await syncShut()) ? undefined : true));
  const pressed = async (key: string, value: string) =>
    (await attribute(`#game-settings-${key}-${value}`, "aria-pressed")) === "true";
  /** Picks `value` from a setting's list, which opens on a press, as a mouse's does. */
  const choose = async (key: string, value: string) => {
    await mousePress(`#game-settings-${key}`, "left");
    await shown(`#game-settings-${key}-${value}`);
    await click(`#game-settings-${key}-${value}`);
    await waitFor(
      `the ${key} list shut`,
      async () => !(await exists(`#game-settings-${key}-${value}`)) || undefined,
    );
  };
  const sync = async () => {
    await syncLit();
    await resetLog();
    await click("#game-settings-save");
    const log = await requestsSettled(GAME_SETTINGS_REQUESTS.length);
    await stepIs("ready");
    return log;
  };
  const readAgain = async () => {
    await resetLog();
    await click("#read-again");
    const log = await waitFor("the settings read again", async () => {
      const now = await requestLog();
      return now.includes(READ) ? now : undefined;
    });
    await stepIs("ready");
    return log;
  };

  await gameSettingsNow("?reset=1");
  await gameSettingsPosts("?reset=1");
  await resetLog();
  await goTo("gameSettings");
  await stepIs("ready");
  results.gameSettingsReadAsThePageOpens = sameBesideLanePictures(await requestLog(), [READ]);

  results.gameSettingsShowHirobasValues =
    (await textOf("#game-settings-region")) === en.t("gameSettings.region.JPN") &&
    (await textOf("#game-settings-speed")) === en.t("gameSettings.speedValue", { speed: "2.0" }) &&
    (await textOf("#game-settings-tone")) === "8ビット太鼓" &&
    (await attribute("#game-settings-tone [lang]", "lang")) === "ja" &&
    (await textOf("#game-settings-folderStars")) === "★8" &&
    (await pressed("visibility", "0")) &&
    (await pressed("voice", "1")) &&
    (await pressed("random", "1")) &&
    (await syncShut());

  await choose("speed", "35");
  await click("#game-settings-voice-0");
  const syncLog = await sync();
  results.gameSettingsSyncWritesOnceAndReadsBack =
    sameBesideLanePictures(syncLog, GAME_SETTINGS_REQUESTS) &&
    same(await gameSettingsNow(), {
      ...INITIAL_GAME_SETTINGS,
      op1: "35",
      voice: "0",
      shut: false,
    }) &&
    (await textOf("#game-settings-speed")) === en.t("gameSettings.speedValue", { speed: "3.5" }) &&
    (await pressed("voice", "0")) &&
    (await syncShut());

  const posts = await gameSettingsPosts();
  const [post] = posts;
  results.gameSettingsPostIsTheSitesShape =
    posts.length === 1 &&
    post?.path === GAME_SETTINGS_SAVE &&
    same(post.fields, GAME_SETTINGS_POST_FIELDS) &&
    post.values.op1 === "35" &&
    post.values.voice === "0" &&
    post.ticketMatched &&
    post.xRequestedWith === "XMLHttpRequest" &&
    post.referer === `${HIROBA}${GAME_SETTINGS_PAGE}` &&
    post.contentType === "application/x-www-form-urlencoded; charset=UTF-8";
  results.gameSettingsSuccessSaysNothing = !(await exists("#game-settings-outcome"));

  // Hiroba's refusal comes with its words, and the page shows the settings it still holds.
  await fetch(
    `${HIROBA}${CONTROL.gameSettingsNextResult}?code=25&message=${encodeURIComponent(BAD_VALUE_MESSAGE)}`,
  );
  await click("#game-settings-voice-1");
  await sync();
  await shown("#game-settings-outcome");
  results.gameSettingsRefusalSaysHirobasWords =
    ((await textOf("#game-settings-outcome")) ?? "").includes(BAD_VALUE_MESSAGE) &&
    (await pressed("voice", "0")) &&
    (await gameSettingsNow()).voice === "0" &&
    (await syncShut());

  // Easy takes no more than ★5: the ★8 held goes, and the stars past 5 are shut in the list.
  await choose("folderDifficulty", "1");
  const starsDropped = (await textOf("#game-settings-folderStars")) === en.t("gameSettings.notSet");
  await mousePress("#game-settings-folderStars", "left");
  await shown("#game-settings-folderStars-5");
  const shutStars = await page.evaluate<string[]>(
    `[...document.querySelectorAll('[id^="game-settings-folderStars-"][aria-disabled="true"]')].map((option) => option.id.slice("game-settings-folderStars-".length))`,
  );
  await press("Escape");
  await waitFor(
    "the stars' list shut",
    async () => !(await exists("#game-settings-folderStars-5")) || undefined,
  );
  results.gameSettingsStarsFollowTheDifficulty =
    starsDropped && same(shutStars, PAST_EASY) && !(await syncShut());
  await click("#game-settings-reset");

  await click("#game-settings-skip-1");
  await syncLit();
  await goTo("overview");
  await goTo("gameSettings");
  await stepIs("ready");
  results.gameSettingsEditsDroppedOnLeaving =
    (await syncShut()) && (await pressed("skip", "0")) && (await gameSettingsNow()).skip === "0";

  // Read again asks Hiroba to refresh first, then reads the page once.
  const againLog = (await readAgain()).filter(
    (line) => line === READ || line === `POST ${REFRESH}`,
  );
  results.gameSettingsReadAgainRefreshesThenReads = same(againLog, [`POST ${REFRESH}`, READ]);

  // During a competition with 双打 charts the page shuts that list, and so does the app.
  await gameSettingsNow("?shut=1");
  await readAgain();
  const lockedRow = await page.evaluate<{ shut: boolean[]; hint: string }>(
    `(() => { const toggles = ["0", "1"].map((value) => document.querySelector("#game-settings-doubleCharts-" + value)); return { shut: toggles.map((toggle) => toggle?.disabled === true), hint: toggles[0]?.closest("li")?.textContent ?? "" }; })()`,
  );
  results.gameSettingsLockedDoubleChartsShut =
    same(lockedRow.shut, [true, true]) &&
    lockedRow.hint.includes(en.t("gameSettings.doubleChartsLocked"));
  await gameSettingsNow("?shut=0");
  await readAgain();

  // A session Hiroba ends after it stored the save: the app drops it and reads Hiroba afresh.
  await gameSettingsNow("?reset=1");
  await fetch(`${HIROBA}${CONTROL.gameSettingsExpireOnSave}`);
  const afterSave = await page.evaluate<{ kind: string; writeMayHaveHappened?: boolean }>(
    `window.abth.changeGameSettings(${JSON.stringify({ expected: GAME_SETTINGS_START, target: { ...GAME_SETTINGS_START, skip: "1" } })})`,
  );
  const dropped =
    afterSave.kind === "sessionGone" &&
    afterSave.writeMayHaveHappened === true &&
    !(await page.evaluate<boolean>("window.abth.isSignedIn()"));
  await click("#read-again");
  await until("You are not signed in.");
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}${CONTROL.lastToken}`)).text());
  await goTo("gameSettings");
  await stepIs("ready");
  results.gameSettingsSessionGoneAfterSave =
    dropped && (await gameSettingsNow()).skip === "1" && (await pressed("skip", "1"));

  await gameSettingsNow("?reset=1");
  await gameSettingsPosts("?reset=1");
}

export const GAME_SETTINGS_SECTION: LaneSection = {
  name: "game-settings",
  phase: "signedIn",
  lane: "names",
  keys: gameSettingsKeys,
  run: gameSettings,
};
