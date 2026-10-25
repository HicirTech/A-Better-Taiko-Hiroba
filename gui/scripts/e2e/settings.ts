import { rmSync } from "node:fs";
import { launch, stop } from "./app";
import { APPEARANCE_USER_DATA, en, ja, LANGUAGE_USER_DATA, NOON_JST, zhHant } from "./config";
import type { Ctx } from "./context";
import { same, waitFor } from "./harness";
import { platesAsked, readHits } from "./stand-in";

export const languageKeys = [
  "systemLanguageTaken",
  "choicesNameEachLanguage",
  "pageKeptAcrossLaunches",
  "shownLanguagePickKept",
  "pickTakesHold",
  "pickKeptAcrossLaunches",
  "systemDefaultTakesHold",
  "systemDefaultKeptAcrossLaunches",
  "choicesMoveByArrows",
] as const;

export async function language(ctx: Ctx) {
  const { results } = ctx;

  const SYSTEM_ZH_HANT = zhHant.t("language.system", { name: "繁體中文" });
  const languageShown = (page: Awaited<ReturnType<typeof launch>>["page"]) =>
    page.evaluate<Record<string, string | null>>(
      `({ lang: document.documentElement.lang, title: document.title, overview: document.querySelector("#nav-overview")?.textContent ?? null, checked: document.querySelector("#language-setting input:checked")?.closest("label")?.textContent ?? null })`,
    );
  rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
  let inLanguage = await launch({
    now: NOON_JST,
    lang: "zh-TW",
    userData: LANGUAGE_USER_DATA,
  });

  try {
    await inLanguage.until(zhHant.t("signIn.action"));
    // Settings opens only after a sign-in; the launches below keep its session.
    await inLanguage.click("#sign-in");
    await inLanguage.until("サンプルどん");
    await inLanguage.goTo("settings");
    results.systemLanguageTaken = same(await languageShown(inLanguage.page), {
      lang: "zh-Hant",
      title: "A Better Taiko Hiroba",
      overview: zhHant.t("nav.overview"),
      checked: SYSTEM_ZH_HANT,
    });
    const listed = await inLanguage.page.evaluate<string[][]>(
      `[...document.querySelectorAll('#language-setting [role="radiogroup"] li label')].filter((label) => label.querySelector('input[type="radio"]') !== null).map((label) => [label.lang, label.textContent])`,
    );
    const groupName = await inLanguage.page.evaluate<string | null>(
      `(() => { const group = document.querySelector('#language-setting [role="radiogroup"]'); return document.getElementById(group?.getAttribute("aria-labelledby") ?? "")?.textContent ?? null; })()`,
    );
    results.choicesNameEachLanguage =
      groupName === zhHant.t("settings.language") &&
      same(listed, [
        ["", SYSTEM_ZH_HANT],
        ["en", "English"],
        ["ja", "日本語"],
        ["zh-Hans", "简体中文"],
        ["zh-Hant", "繁體中文"],
      ]);
    await inLanguage.click("#language-zh-Hant");
    await stop(inLanguage);
    inLanguage = await launch({
      now: NOON_JST,
      lang: "en-US",
      userData: LANGUAGE_USER_DATA,
    });
    await waitFor(
      "settings page",
      async () => (await inLanguage.textOf("#language-setting")) ?? undefined,
    );
    results.pageKeptAcrossLaunches =
      (await inLanguage.currentPage()) === "settings" &&
      (await inLanguage.textOf("#sign-in")) === null;
    const kept = await languageShown(inLanguage.page);
    results.shownLanguagePickKept = same([kept.lang, kept.checked], ["zh-Hant", "繁體中文"]);
    await inLanguage.click("#language-ja");
    await inLanguage.until(ja.t("settings.account"));
    results.pickTakesHold = same(await languageShown(inLanguage.page), {
      lang: "ja",
      title: "A Better Taiko Hiroba",
      overview: ja.t("nav.overview"),
      checked: "日本語",
    });
    await stop(inLanguage);
    inLanguage = await launch({
      now: NOON_JST,
      lang: "zh-TW",
      userData: LANGUAGE_USER_DATA,
    });
    await inLanguage.until(ja.t("settings.account"));
    results.pickKeptAcrossLaunches = (await languageShown(inLanguage.page)).lang === "ja";
    await inLanguage.click("#language-system");
    await inLanguage.until(zhHant.t("settings.account"));
    results.systemDefaultTakesHold = same(await languageShown(inLanguage.page), {
      lang: "zh-Hant",
      title: "A Better Taiko Hiroba",
      overview: zhHant.t("nav.overview"),
      checked: SYSTEM_ZH_HANT,
    });
    await stop(inLanguage);
    inLanguage = await launch({
      now: NOON_JST,
      lang: "en-US",
      userData: LANGUAGE_USER_DATA,
    });
    await inLanguage.until(en.t("settings.account"));
    results.systemDefaultKeptAcrossLaunches = same(await languageShown(inLanguage.page), {
      lang: "en",
      title: "A Better Taiko Hiroba",
      overview: en.t("nav.overview"),
      checked: en.t("language.system", { name: "English" }),
    });
    const ARROW_DOWN = { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 };
    const arrowDown = async () => {
      await inLanguage.page.send("Input.dispatchKeyEvent", { type: "keyDown", ...ARROW_DOWN });
      await inLanguage.page.send("Input.dispatchKeyEvent", { type: "keyUp", ...ARROW_DOWN });
    };
    await inLanguage.page.evaluate(
      `document.querySelector("#language-setting input:checked").focus()`,
    );
    await arrowDown();
    const checkedByArrow = await waitFor("English checked", async () => {
      const shown = await languageShown(inLanguage.page);
      return shown.checked === "English" ? shown.lang : undefined;
    });
    await arrowDown();
    await inLanguage.until(ja.t("settings.account"));
    results.choicesMoveByArrows =
      checkedByArrow === "en" && same((await languageShown(inLanguage.page)).checked, "日本語");
  } finally {
    await stop(inLanguage);
    rmSync(LANGUAGE_USER_DATA, { recursive: true, force: true });
  }
}

export const appearanceKeys = [
  "appearanceStartsAsInstalled",
  "hirobasColoursTakeHold",
  "darkModeTakesHold",
  "appearanceKeptAcrossLaunches",
  "defaultAppearanceComesBack",
] as const;

// Hiroba's colours: its yellow page and red panel in light, its night purple and dark red in dark.
const HIROBA_LIGHT = { page: "rgb(255, 204, 0)", panel: "rgb(154, 18, 0)" };
const HIROBA_DARK = { page: "rgb(21, 8, 38)", panel: "rgb(77, 9, 0)" };

export async function appearance(ctx: Ctx) {
  const { results } = ctx;
  const lookOf = (app: Awaited<ReturnType<typeof launch>>) =>
    app.page.evaluate<Record<string, string | null>>(
      `(() => { const pressed = (id) => document.getElementById(id)?.getAttribute("aria-pressed") === "true"; const panel = document.querySelector(".MuiDrawer-paper"); return { theme: ["default", "hiroba"].find((name) => pressed("theme-" + name)) ?? null, mode: ["system", "light", "dark"].find((mode) => pressed("theme-mode-" + mode)) ?? null, page: getComputedStyle(document.body).backgroundColor, panel: panel === null ? null : getComputedStyle(panel).backgroundColor }; })()`,
    );
  const choose = async (app: Awaited<ReturnType<typeof launch>>, id: string, page: string) => {
    await app.click(`#${id}`);
    await waitFor(
      `the page in ${page}`,
      async () => (await lookOf(app)).page === page || undefined,
    );
  };
  rmSync(APPEARANCE_USER_DATA, { recursive: true, force: true });
  let app = await launch({ now: NOON_JST, userData: APPEARANCE_USER_DATA });

  try {
    await app.until(en.t("signIn.action"));
    // Settings opens only after a sign-in; the launches below keep its session.
    await app.click("#sign-in");
    await app.until("サンプルどん");
    await app.goTo("settings");
    const installed = await lookOf(app);
    results.appearanceStartsAsInstalled =
      installed.theme === "default" && installed.mode === "system";
    await choose(app, "theme-mode-light", "rgb(255, 255, 255)");
    await choose(app, "theme-hiroba", HIROBA_LIGHT.page);
    results.hirobasColoursTakeHold = same(await lookOf(app), {
      theme: "hiroba",
      mode: "light",
      ...HIROBA_LIGHT,
    });
    await choose(app, "theme-mode-dark", HIROBA_DARK.page);
    results.darkModeTakesHold = same(await lookOf(app), {
      theme: "hiroba",
      mode: "dark",
      ...HIROBA_DARK,
    });
    await stop(app);
    app = await launch({ now: NOON_JST, userData: APPEARANCE_USER_DATA });
    await waitFor("settings page", async () => (await app.textOf("#appearance")) ?? undefined);
    results.appearanceKeptAcrossLaunches = same(await lookOf(app), {
      theme: "hiroba",
      mode: "dark",
      ...HIROBA_DARK,
    });
    const systemPage = (await app.page.evaluate<boolean>(
      `matchMedia("(prefers-color-scheme: dark)").matches`,
    ))
      ? "rgb(18, 18, 18)"
      : "rgb(255, 255, 255)";
    await choose(app, "theme-default", "rgb(18, 18, 18)");
    await choose(app, "theme-mode-system", systemPage);
    await stop(app);
    app = await launch({ now: NOON_JST, userData: APPEARANCE_USER_DATA });
    await waitFor("settings page", async () => (await app.textOf("#appearance")) ?? undefined);
    const back = await lookOf(app);
    results.defaultAppearanceComesBack =
      back.theme === "default" && back.mode === "system" && back.page === systemPage;
  } finally {
    await stop(app);
    rmSync(APPEARANCE_USER_DATA, { recursive: true, force: true });
  }
}

export const settingsKeys = [
  "settingsLaidOutLikeGmail",
  "githubOpensTheRepository",
  "languageRedrawsInPlace",
  "languageAsksHirobaNothing",
  "hirobaWordsMarkedJapanese",
  "gameTermsLeftUnmarked",
] as const;

export async function settings(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;

  await goTo("settings");
  const settingsLayout = await page.evaluate<Record<string, unknown>>(
    `(() => { const sections = [...document.querySelectorAll("main section")]; const signOut = document.querySelector("#sign-out"); return { sections: sections.map((section) => [section.id, document.getElementById(section.getAttribute("aria-labelledby"))?.tagName ?? null, section.querySelector("h2 svg") !== null, section.querySelectorAll("ul").length]), radios: document.querySelectorAll('#language-setting li input[type="radio"]').length, checked: document.querySelectorAll("#language-setting input:checked").length, who: document.querySelector("#account-who")?.textContent ?? null, signOutBeside: signOut?.closest("li") === document.querySelector("#account-who")?.closest("li"), casing: signOut === null ? null : getComputedStyle(signOut).textTransform }; })()`,
  );
  results.settingsLaidOutLikeGmail = same(settingsLayout, {
    sections: [
      ["language-setting", "H2", true, 1],
      ["appearance", "H2", true, 1],
      ["account", "H2", true, 1],
      ["updates", "H2", true, 1],
      ["song-levels", "H2", true, 1],
      ["scores-settings", "H2", true, 1],
      ["song-data", "H2", true, 1],
      ["github", "H2", true, 1],
    ],
    radios: 5,
    checked: 1,
    who: "Signed in as サンプルどん",
    signOutBeside: true,
    casing: "uppercase",
  });
  // Caught here, or the system's browser would open on the repository's page.
  await page.evaluate(
    `window.openedUrls = []; window.open = (url) => { window.openedUrls.push(String(url)); return null; };`,
  );
  await click("#github-repository");
  results.githubOpensTheRepository =
    (await textOf("#github-repository"))?.includes("HicirTech/A-Better-Taiko-Hiroba") === true &&
    same(await page.evaluate<string[]>("window.openedUrls"), [
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba",
    ]);
  await goTo("overview");

  const pickLanguage = async (locale: string) => {
    await goTo("settings");
    await click(`#language-${locale}`);
    await waitFor(
      `language ${locale}`,
      async () =>
        (await page.evaluate<string>("document.documentElement.lang")) === locale || undefined,
    );
    await goTo("overview");
  };
  const readsBeforeLanguage = await readHits();
  const platesBeforeLanguage = (await platesAsked()).length;
  await pickLanguage("ja");
  const japaneseUpdate = (await textOf("#nav-last-updated")) ?? "";
  const japaneseLead = ja.t("profile.fetchedAt", { time: "" });
  const japaneseTime = japaneseUpdate.slice(japaneseLead.length);
  results.languageRedrawsInPlace =
    (await textOf("#rank-8")) === ja.t("panel.countOf", { count: "3", total: "102" }) &&
    (await textOf("#rank-5-percent")) === "30.4%" &&
    (await textOf("#profile-title")) === ja.t("profile.title", { title: "サンプルの称号" }) &&
    (await textOf("#dan")) === ja.t("profile.dan", { dan: "九段" }) &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    japaneseUpdate.startsWith(japaneseLead) &&
    japaneseTime.length > 0 &&
    !/\d{4}年/.test(japaneseTime) &&
    !/\d{2}:\d{2}:\d{2}/.test(japaneseTime) &&
    /\d{1,2}:\d{2}/.test(japaneseTime);
  await pickLanguage("en");
  await Bun.sleep(1000);
  results.languageAsksHirobaNothing =
    (await readHits()) === readsBeforeLanguage &&
    (await platesAsked()).length === platesBeforeLanguage &&
    (await textOf("#crowns-silver")) === "11 of 14";
  const langOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.lang ?? null`,
    );
  results.hirobaWordsMarkedJapanese =
    (await langOf("#profile h2")) === "ja" &&
    (await textOf('#title-plate span[lang="ja"]')) === "サンプルの称号" &&
    (await langOf("#medal-name")) === "ja";
  results.gameTermsLeftUnmarked =
    (await textOf("#medal h2")) === "Don Medals" &&
    (await langOf("#medal h2")) === "" &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#ranks [lang], #crowns [lang]").length`,
    )) === 0;
}
