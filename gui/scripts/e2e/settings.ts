import { rmSync } from "node:fs";
import { launch, stop } from "./app";
import { en, ja, LANGUAGE_USER_DATA, NOON_JST, zhHant } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";
import { platesAsked, readHits, requestLog, resetLog } from "./stand-in";

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
  await resetLog();
  let inLanguage = await launch({
    now: NOON_JST,
    lang: "zh-TW",
    userData: LANGUAGE_USER_DATA,
  });

  try {
    await inLanguage.until(zhHant.t("signIn.action"));
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
    results.pickKeptAcrossLaunches =
      (await languageShown(inLanguage.page)).lang === "ja" && same(await requestLog(), []);
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
    results.systemDefaultKeptAcrossLaunches =
      same(await languageShown(inLanguage.page), {
        lang: "en",
        title: "A Better Taiko Hiroba",
        overview: en.t("nav.overview"),
        checked: en.t("language.system", { name: "English" }),
      }) && same(await requestLog(), []);
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

export const settingsKeys = [
  "settingsLaidOutLikeGmail",
  "languageRedrawsInPlace",
  "languageAsksHirobaNothing",
  "hirobaWordsMarkedJapanese",
  "gameTermsLeftUnmarked",
] as const;

export async function settings(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { column } = pageHelpers(page);

  const overviewScrolls = await page.evaluate<boolean>(
    "document.documentElement.scrollHeight > window.innerHeight",
  );
  const columnOnOverview = await column();
  await goTo("settings");
  const columnOnSettings = await column();
  state.overviewScrolls = overviewScrolls;
  state.columnOnOverview = columnOnOverview;
  state.columnOnSettings = columnOnSettings;

  const settingsLayout = await page.evaluate<Record<string, unknown>>(
    `(() => { const sections = [...document.querySelectorAll("main section")]; const signOut = document.querySelector("#sign-out"); return { sections: sections.map((section) => [section.id, document.getElementById(section.getAttribute("aria-labelledby"))?.tagName ?? null, section.querySelector("h2 svg") !== null, section.querySelectorAll("ul").length]), radios: document.querySelectorAll('#language-setting li input[type="radio"]').length, checked: document.querySelectorAll("#language-setting input:checked").length, who: document.querySelector("#account-who")?.textContent ?? null, signOutBeside: signOut?.closest("li") === document.querySelector("#account-who")?.closest("li"), casing: signOut === null ? null : getComputedStyle(signOut).textTransform }; })()`,
  );
  results.settingsLaidOutLikeGmail = same(settingsLayout, {
    sections: [
      ["language-setting", "H2", true, 1],
      ["account", "H2", true, 1],
      ["updates", "H2", true, 1],
      ["song-data", "H2", true, 1],
    ],
    radios: 5,
    checked: 1,
    who: "Signed in as サンプルどん",
    signOutBeside: true,
    casing: "uppercase",
  });
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
  const japaneseUpdate = (await textOf("#last-updated")) ?? "";
  const japaneseLead = ja.t("profile.fetchedAt", { time: "" });
  results.languageRedrawsInPlace =
    (await textOf("#rank-8")) === ja.t("panel.countOf", { count: "3", total: "102" }) &&
    (await textOf("#rank-5-percent")) === "30.4%" &&
    (await textOf("#profile-title")) === ja.t("profile.title", { title: "サンプルの称号" }) &&
    (await textOf("#dan")) === ja.t("profile.dan", { dan: "九段" }) &&
    (await textOf("#profile h2")) === "サンプルどん" &&
    japaneseUpdate.startsWith(japaneseLead) &&
    /^\d{4}年\d{1,2}月\d{1,2}日 \d{1,2}:\d{2}:\d{2}$/.test(
      japaneseUpdate.slice(japaneseLead.length),
    );
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
