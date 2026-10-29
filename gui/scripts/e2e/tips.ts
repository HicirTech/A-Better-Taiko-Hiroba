/** The tips: a page's told the first time it opens, gone past one by one or skipped, kept. */
import { TIPS } from "../../src/pages/page-tips";
import { SEEN_TIPS_KEY } from "../../src/shared/tips/seen-tips";
import { en } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";

const ALL_TIPS = TIPS.map(({ id }) => id);
/** Long past the time a drawn page waits before its tips start. */
const NO_TIP_MS = 2500;

export const tipsKeys = [
  "tipsShowOnAPageFirstOpened",
  "tipPointsAtWhatItTells",
  "tipNextMarksItSeen",
  "tipSkipEndsThePagesTips",
  "tipsSeenDoNotShowAgain",
  "navigationTipsOnTheOverview",
  "otherPagesTipsComeAlone",
  "tipOpensWhatItTells",
  "newerTipAloneWhereTheRestWereSeen",
] as const;

export async function tips(ctx: Ctx) {
  const { results } = ctx;
  const { click, goTo, page, textOf } = ctx.app;
  const { attribute, boxOf, exists } = pageHelpers(page);
  const seenNow = async () =>
    JSON.parse(
      (await page.evaluate<string | null>(
        `localStorage.getItem(${JSON.stringify(SEEN_TIPS_KEY)})`,
      )) ?? "[]",
    ) as string[];
  const keepSeen = (ids: readonly string[]) =>
    page.evaluate(
      `localStorage.setItem(${JSON.stringify(SEEN_TIPS_KEY)}, ${JSON.stringify(JSON.stringify(ids))})`,
    );
  const tipShown = (other: string | null = null) =>
    waitFor("a tip", async () => {
      const tip = await attribute("#tip-bubble", "data-tip");
      return tip !== null && tip !== other ? tip : undefined;
    });
  const tipsGone = () =>
    waitFor("the tips gone", async () => !(await exists("#tip-tour")) || undefined);
  const count = () => textOf("#tip-bubble .MuiTypography-caption");
  const of = (step: number, steps: number) => en.t("tips.step", { step, count: steps });

  // Every tip as a fresh install has them, over a page that opens anew.
  await goTo("settings");
  await keepSeen([]);
  await goTo("rating");
  const first = await tipShown();
  const ring = await boxOf("#tip-ring");
  const target = await boxOf("#rating-system-ourtaikoV1");
  results.tipsShowOnAPageFirstOpened = first === "rating.system" && (await count()) === of(1, 2);
  results.tipPointsAtWhatItTells =
    ring.left <= target.left &&
    ring.right >= target.right &&
    ring.top <= target.top &&
    ring.bottom >= target.bottom;

  await click("#tip-next");
  const second = await tipShown(first);
  results.tipNextMarksItSeen = second === "rating.share" && same(await seenNow(), [first]);

  await click("#tip-skip");
  await tipsGone();
  results.tipSkipEndsThePagesTips = same([...(await seenNow())].sort(), [
    "rating.share",
    "rating.system",
  ]);

  await goTo("settings");
  await goTo("rating");
  await Bun.sleep(NO_TIP_MS);
  results.tipsSeenDoNotShowAgain = !(await exists("#tip-bubble"));

  // The navigation's tips are told once, on the Overview, before its own.
  await goTo("overview");
  const navigation = await tipShown();
  results.navigationTipsOnTheOverview =
    navigation === "app.readAgainKeys" && (await count()) === of(1, 6);
  await click("#tip-skip");
  await tipsGone();

  await goTo("knowYourself");
  const own = await tipShown();
  const cardOpenWhileTold = await exists('#know-crowns [aria-expanded="true"]');
  results.otherPagesTipsComeAlone =
    own === "knowYourself.cards" &&
    (await count()) === of(1, 1) &&
    (await textOf("#tip-next")) === en.t("tips.done");
  await click("#tip-next");
  await tipsGone();
  const cardFoldedAfter = await waitFor(
    "the card folded again",
    async () => (await exists('#know-crowns [aria-expanded="false"]')) || undefined,
  );

  // Favourites' tip on its sets opens their drawer while it is told, and shuts it after.
  await keepSeen(ALL_TIPS.filter((id) => id !== "favorites.setMenu"));
  await goTo("favorites");
  const setsTip = await tipShown();
  const drawerOpenWhileTold = await exists("#favorites-drawer");
  await click("#tip-next");
  await tipsGone();
  const drawerShutAfter = await waitFor(
    "the sets drawer shut",
    async () => !(await exists("#favorites-drawer")) || undefined,
  );
  results.tipOpensWhatItTells =
    cardOpenWhileTold &&
    cardFoldedAfter &&
    setsTip === "favorites.setMenu" &&
    drawerOpenWhileTold &&
    drawerShutAfter;
  await goTo("settings");

  // An update that brought one tip: only it, on its page.
  await keepSeen(ALL_TIPS.filter((id) => id !== "favorites.gift"));
  await goTo("favorites");
  const newer = await tipShown();
  results.newerTipAloneWhereTheRestWereSeen =
    newer === "favorites.gift" && (await count()) === of(1, 1);
  await click("#tip-next");
  await tipsGone();
  await keepSeen(ALL_TIPS);
}
