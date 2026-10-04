import { BRIDGE_CHANNELS } from "../../src/session-port";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";

export async function signedOut(ctx: Ctx) {
  const { results } = ctx;
  const { click, currentPage, goTo, page, textOf } = ctx.app;
  const { attribute, exists, menuClosed, menuOpened, press } = pageHelpers(page);

  const NAVIGATION = [
    "A Better Taiko Hiroba",
    "Overview",
    "Costume",
    "Nickname & title",
    "Favourites",
    "Settings",
  ].join("");
  const shownSignedOut: boolean[] = [];
  for (const each of ["costume", "nameTitle", "favorites", "settings", "overview"] as const) {
    await goTo(each);
    shownSignedOut.push(
      each === "settings"
        ? (await exists("#language-setting")) &&
            (await exists("#sign-out-note")) &&
            (await textOf("#account-who")) === "Not signed in" &&
            !(await exists("#sign-out")) &&
            !(await exists("#sign-in"))
        : (await exists("#sign-in-card #sign-in")) && !(await exists("#language-setting")),
    );
  }
  results.navigationShown =
    (await textOf("nav")) === NAVIGATION &&
    (await textOf("main h1")) === "Overview" &&
    !(await exists("header")) &&
    !(await exists("#nav-menu")) &&
    shownSignedOut.every(Boolean);
  const entriesIn = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${selector} [id^="nav-"]`)})].map((entry) => entry.id + (entry.querySelector("svg") === null ? ":no-icon" : ""))`,
    );
  const PAGE_ENTRIES = [
    "nav-overview",
    "nav-costume",
    "nav-nameTitle",
    "nav-favorites",
    "nav-settings",
  ];
  const sidePanelEntries = await entriesIn("nav");
  await goTo("costume");
  const costumeShownSignedOut = (await textOf("main h1")) === "Costume";
  await goTo("nameTitle");
  const nameTitleShownSignedOut =
    (await textOf("main h1")) === "Nickname & title" && (await exists("#sign-in-card #sign-in"));
  await goTo("overview");

  const shownIn = async (scheme: "dark" | "light") => {
    await page.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
    await waitFor(
      `colour scheme ${scheme}`,
      async () =>
        (await page.evaluate<string>("getComputedStyle(document.documentElement).colorScheme")) ===
          scheme || undefined,
      5_000,
    );
    return page.evaluate<string>("getComputedStyle(document.body).backgroundColor");
  };
  const darkBackground = await shownIn("dark");
  const lightBackground = await shownIn("light");
  await page.send("Emulation.setEmulatedMedia", { features: [] });
  results.schemeFollowsSystem =
    darkBackground === "rgb(18, 18, 18)" && lightBackground === "rgb(255, 255, 255)";

  const bottomOf = (selector: string) =>
    page.evaluate<number>(
      `document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().bottom`,
    );
  const topOf = (selector: string) =>
    page.evaluate<number>(
      `document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top`,
    );

  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 800,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await waitFor("drawer button", async () => (await exists("#nav-menu")) || undefined);
  const menuFloats =
    !(await exists("nav")) &&
    (await attribute("#nav-menu", "aria-label")) === "Menu" &&
    (await attribute("#nav-menu", "aria-expanded")) === "false" &&
    (await bottomOf("#nav-menu")) <= (await topOf("#sign-in-card"));
  await menuOpened();
  const drawerShown =
    (await textOf("nav")) === NAVIGATION &&
    (await attribute("#nav-menu", "aria-expanded")) === "true" &&
    (await currentPage()) === "overview";
  const drawerEntries = await entriesIn("nav");
  await click("#nav-costume");
  await menuClosed();
  const costumePicked = (await textOf("main h1")) === "Costume" && (await exists("#sign-in"));
  await menuOpened();
  const costumeMarked = (await currentPage()) === "costume";
  await click("#nav-nameTitle");
  await menuClosed();
  const nameTitlePicked =
    (await textOf("main h1")) === "Nickname & title" && (await exists("#sign-in"));
  await menuOpened();
  const nameTitleMarked = (await currentPage()) === "nameTitle";
  await click("#nav-favorites");
  await menuClosed();
  const pickTaken = (await textOf("main h1")) === "Favourites" && (await exists("#sign-in"));
  await menuOpened();
  const pickMarked = (await currentPage()) === "favorites";
  await press("Escape");
  await menuClosed();
  const focusBack = await waitFor(
    "focus back on the drawer button",
    async () =>
      (await page.evaluate<string | undefined>("document.activeElement?.id")) === "nav-menu" ||
      undefined,
  );
  await menuOpened();
  await click(".MuiBackdrop-root");
  await menuClosed();
  await page.send("Emulation.clearDeviceMetricsOverride", {});
  await waitFor("side panel", async () => (await exists("#nav-overview")) || undefined);
  results.menuOnNarrowWindow =
    menuFloats &&
    drawerShown &&
    pickTaken &&
    pickMarked &&
    focusBack &&
    (await textOf("main h1")) === "Favourites" &&
    !(await exists("#nav-menu"));
  results.costumePageInNavigation =
    same(sidePanelEntries, PAGE_ENTRIES) &&
    same(drawerEntries, PAGE_ENTRIES) &&
    costumeShownSignedOut &&
    costumePicked &&
    costumeMarked;
  results.nameTitlePageInNavigation =
    same(sidePanelEntries, PAGE_ENTRIES) &&
    same(drawerEntries, PAGE_ENTRIES) &&
    nameTitleShownSignedOut &&
    nameTitlePicked &&
    nameTitleMarked;
  await goTo("overview");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );
  results.bridgeIsThePortVerbs = same(
    (results.surface as { bridge: string[] }).bridge,
    Object.keys(BRIDGE_CHANNELS),
  );
}
