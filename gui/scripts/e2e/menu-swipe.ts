import type { Ctx } from "./context";
import { type Point, pageHelpers, waitFor } from "./harness";

export const menuSwipeKeys = [
  "menuButtonHiddenOnATouchPhone",
  "menuOpensBySwipe",
  "menuClosesBySwipe",
  "menuIgnoresOtherMoves",
] as const;

const PHONE = { width: 390, height: 844 } as const;

export async function menuSwipe(ctx: Ctx) {
  const { results } = ctx;
  const { page, goTo } = ctx.app;
  const { atSize, attribute, swipe, touchEmulated } = pageHelpers(page);
  const opened = async () => (await attribute("#nav-menu", "aria-expanded")) === "true";
  // The button's round frame is what a finger would see.
  const frameWidth = () =>
    page.evaluate<number>(
      `document.querySelector("#nav-menu")?.parentElement?.getBoundingClientRect().width ?? -1`,
    );
  const settle = () => Bun.sleep(500);

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
