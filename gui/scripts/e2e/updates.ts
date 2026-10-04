import { rmSync } from "node:fs";
import { type App, launch, stop } from "./app";
import { en, HIROBA, NOON_JST, UPDATE_FEED, UPDATES_USER_DATA } from "./config";
import type { Ctx } from "./context";
import { same, waitFor } from "./harness";
import { hitsOn } from "./stand-in";

export const updatesKeys = [
  "updateNotAskedWithoutTheFeed",
  "updateDialogForANewerFeed",
  "updateDownloadOpensTheRelease",
  "updateCheckedAtMostDaily",
  "updateShownOncePerVersion",
  "updateFailureSilentOnLaunch",
  "updateManualCheckStates",
] as const;

const FEED_ENV = { ABTH_DEV_UPDATE_FEED: `${HIROBA}${UPDATE_FEED}` };
const RELEASE = "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/tag/v0.2.0";

const setFeed = (query: string) => fetch(`${HIROBA}/__update-feed?${query}`);
const feedHits = () => hitsOn(UPDATE_FEED);

export async function updates(ctx: Ctx) {
  const { results } = ctx;
  const launchUpdates = (env: Record<string, string> = FEED_ENV) =>
    launch({ now: NOON_JST, userData: UPDATES_USER_DATA, env });
  const firstScreen = (app: App) => app.until(en.t("signIn.action"));
  const dialogShown = (app: App) =>
    app.page.evaluate<boolean>(`document.querySelector("#update-dialog") !== null`);
  // A check is due again once the last one is a day old.
  const forgetTheLastCheck = (app: App) =>
    app.page.evaluate(`localStorage.setItem("abth.update.checkedAt", "1000")`);
  const feedAskedAfter = (hits: number) =>
    waitFor("the feed asked", async () => ((await feedHits()) > hits ? true : undefined));

  rmSync(UPDATES_USER_DATA, { recursive: true, force: true });
  await setFeed("version=0.2.0");
  const hitsAtStart = await feedHits();

  let app = await launchUpdates({});
  try {
    await firstScreen(app);
    await Bun.sleep(2000);
    results.updateNotAskedWithoutTheFeed =
      (await feedHits()) === hitsAtStart &&
      same(
        await app.page.evaluate<string[]>(
          `Object.keys(localStorage).filter((key) => key.startsWith("abth.update."))`,
        ),
        [],
      ) &&
      !(await dialogShown(app));
  } finally {
    await stop(app);
  }

  app = await launchUpdates();
  try {
    await firstScreen(app);
    await waitFor("the update dialog", async () => (await dialogShown(app)) || undefined);
    const shown = await app.page.evaluate<{ title: string | null; notes: string[] }>(
      `({ title: document.querySelector("#update-dialog .MuiDialogTitle-root")?.textContent ?? null, notes: [...document.querySelectorAll("#update-notes li")].map((li) => li.textContent) })`,
    );
    results.updateDialogForANewerFeed =
      (await feedHits()) === hitsAtStart + 1 &&
      shown.title === "A Better Taiko Hiroba 0.2.0" &&
      same(shown.notes, ["What is new in 0.2.0", "Pictures load sooner"]);
    // Caught here, or the system browser would open on the release page.
    await app.page.evaluate(
      `window.openedUrls = []; window.open = (url) => { window.openedUrls.push(String(url)); return null; };`,
    );
    await app.click("#update-download");
    await waitFor("the dialog closed", async () => ((await dialogShown(app)) ? undefined : true));
    results.updateDownloadOpensTheRelease = same(
      await app.page.evaluate<string[]>("window.openedUrls"),
      [RELEASE],
    );
  } finally {
    await stop(app);
  }

  const hitsAfterShown = await feedHits();
  app = await launchUpdates();
  try {
    await firstScreen(app);
    await Bun.sleep(2500);
    results.updateCheckedAtMostDaily =
      (await feedHits()) === hitsAfterShown && !(await dialogShown(app));
    await forgetTheLastCheck(app);
  } finally {
    await stop(app);
  }

  app = await launchUpdates();
  try {
    await firstScreen(app);
    await feedAskedAfter(hitsAfterShown);
    await Bun.sleep(1500);
    results.updateShownOncePerVersion = !(await dialogShown(app));
    await forgetTheLastCheck(app);
  } finally {
    await stop(app);
  }

  await setFeed("status=500");
  const hitsBeforeFailure = await feedHits();
  app = await launchUpdates();
  try {
    await firstScreen(app);
    await feedAskedAfter(hitsBeforeFailure);
    await Bun.sleep(1500);
    results.updateFailureSilentOnLaunch =
      !(await dialogShown(app)) && !(await app.text()).includes(en.t("update.failed"));

    await app.goTo("settings");
    const versionLine = await app.textOf("#app-version");
    const statusIs = (wanted: string) =>
      waitFor(`the status "${wanted}"`, async () =>
        (await app.textOf("#update-status")) === wanted ? true : undefined,
      );
    await app.click("#update-check");
    await statusIs(en.t("update.failed"));
    const releasesOffered = await app.page.evaluate<boolean>(
      `document.querySelector("#update-releases") !== null`,
    );
    await setFeed("version=0.1.0");
    await app.click("#update-check");
    await statusIs(en.t("update.upToDate"));
    await setFeed("version=0.2.0");
    await app.click("#update-check");
    await waitFor(
      "the dialog on a manual check",
      async () => (await dialogShown(app)) || undefined,
    );
    results.updateManualCheckStates = versionLine === "Version 0.1.0" && releasesOffered;
  } finally {
    await stop(app);
    await setFeed("status=404");
    rmSync(UPDATES_USER_DATA, { recursive: true, force: true });
  }
}
