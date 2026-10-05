import type { Ctx } from "./context";
import { type Point, pageHelpers, same, waitFor } from "./harness";

export const menuSwipeKeys = [
  "navigationShown",
  "menuOnNarrowWindow",
  "everyPageInNavigation",
  "menuButtonHiddenOnATouchPhone",
  "menuOpensBySwipe",
  "menuClosesBySwipe",
  "menuIgnoresOtherMoves",
] as const;

const PHONE = { width: 390, height: 844 } as const;
const NAVIGATION = [
  "A Better Taiko Hiroba",
  "Overview",
  "Costume",
  "Nickname & title",
  "Favourites",
  "Settings",
].join("");
const PAGE_ENTRIES = [
  "nav-overview",
  "nav-costume",
  "nav-nameTitle",
  "nav-favorites",
  "nav-settings",
];

export async function menuSwipe(ctx: Ctx) {
  const { results } = ctx;
  const { click, page, goTo, textOf } = ctx.app;
  const { atSize, attribute, boxOf, exists, menuClosed, menuOpened, press, swipe, touchEmulated } =
    pageHelpers(page);
  const opened = async () => (await attribute("#nav-menu", "aria-expanded")) === "true";
  // The button's round frame is what a finger would see.
  const frameWidth = () =>
    page.evaluate<number>(
      `document.querySelector("#nav-menu")?.parentElement?.getBoundingClientRect().width ?? -1`,
    );
  const settle = () => Bun.sleep(500);
  const entriesIn = (selector: string) =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${selector} [id^="nav-"]`)})].map((entry) => entry.id + (entry.querySelector("svg") === null ? ":no-icon" : ""))`,
    );

  // Signed in, the pages are listed: in a side panel on a wide window, in a drawer on a narrow one.
  await goTo("overview");
  const sidePanelEntries = await entriesIn("nav");
  results.navigationShown =
    (await textOf("nav")) === NAVIGATION &&
    (await textOf("main h1")) === "Overview" &&
    !(await exists("header")) &&
    !(await exists("#nav-menu"));
  const narrow = await atSize(480, 800, async () => {
    await waitFor("drawer button", async () => (await exists("#nav-menu")) || undefined);
    const menuFloats =
      !(await exists("nav")) &&
      (await attribute("#nav-menu", "aria-label")) === "Menu" &&
      (await attribute("#nav-menu", "aria-expanded")) === "false" &&
      (await boxOf("#nav-menu")).bottom <= (await boxOf("#profile")).top;
    await menuOpened();
    const drawerShown =
      (await textOf("nav")) === NAVIGATION &&
      (await attribute("#nav-menu", "aria-expanded")) === "true" &&
      (await exists(".MuiDrawer-paper #read-again"));
    const drawerEntries = await entriesIn("nav");
    await click("#nav-settings");
    await menuClosed();
    const pickTaken = (await textOf("main h1")) === "Settings";
    await menuOpened();
    const pickMarked = (await attribute("#nav-settings", "aria-current")) === "page";
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
    return {
      shown: menuFloats && drawerShown && pickTaken && pickMarked && focusBack,
      drawerEntries,
    };
  });
  await waitFor("side panel", async () => (await exists("#nav-overview")) || undefined);
  results.menuOnNarrowWindow =
    narrow.shown && (await textOf("main h1")) === "Settings" && !(await exists("#nav-menu"));
  results.everyPageInNavigation =
    same(sidePanelEntries, PAGE_ENTRIES) && same(narrow.drawerEntries, PAGE_ENTRIES);

  // Favourites has no tooltips: a touch that starts on one makes MUI ignore later mouse hovers.
  await goTo("favorites");
  await atSize(PHONE.width, PHONE.height, async () => {
    const frameForAMouse = await frameWidth();
    await touchEmulated(true);
    try {
      await settle();
      results.menuButtonHiddenOnATouchPhone =
        frameForAMouse >= 40 &&
        (await frameWidth()) <= 2 &&
        (await page.evaluate<boolean>(`document.querySelector("#nav-menu") !== null`));

      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await waitFor("the menu opened by a swipe", async () => (await opened()) || undefined);
      results.menuOpensBySwipe = true;
      await settle();
      await swipe({ x: 220, y: 420 }, { x: 100, y: 425 });
      await waitFor("the menu closed by a swipe", async () =>
        (await opened()) ? undefined : true,
      );
      results.menuClosesBySwipe = true;
      await settle();

      const others: [from: Point, to: Point][] = [
        [
          { x: 120, y: 420 },
          { x: 150, y: 422 },
        ],
        [
          { x: 120, y: 420 },
          { x: 190, y: 340 },
        ],
        [
          { x: 300, y: 420 },
          { x: 385, y: 425 },
        ],
      ];
      let openedByAnother = false;
      for (const [from, to] of others) {
        await swipe(from, to);
        await settle();
        openedByAnother ||= await opened();
      }
      results.menuIgnoresOtherMoves = !openedByAnother;
    } finally {
      await touchEmulated(false);
    }
  });
  await goTo("overview");
}
