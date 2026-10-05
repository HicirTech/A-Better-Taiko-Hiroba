import { BRIDGE_CHANNELS } from "../../src/session-port";
import type { Ctx } from "./context";
import { pageHelpers, same, waitFor } from "./harness";

export const signedOutKeys = [
  "noNavigationSignedOut",
  "schemeFollowsSystem",
  "surface",
  "bridgeIsThePortVerbs",
] as const;

export async function signedOut(ctx: Ctx) {
  const { results } = ctx;
  const { page, textOf } = ctx.app;
  const { atSize, exists, swipe, touchEmulated } = pageHelpers(page);

  // Before a sign-in the window holds the sign-in card alone: no pages to go to, and no menu.
  const onlyTheSignIn = async () =>
    !(await exists("nav")) &&
    !(await exists("#nav-menu")) &&
    !(await exists("#read-again")) &&
    (await exists("#sign-in-card #sign-in")) &&
    !(await exists("#language-setting"));
  const wide = (await onlyTheSignIn()) && (await textOf("main h1")) === "Overview";
  const narrow = await atSize(480, 800, onlyTheSignIn);
  const swipedOnAPhone = await atSize(390, 844, async () => {
    await touchEmulated(true);
    try {
      await swipe({ x: 120, y: 420 }, { x: 220, y: 430 });
      await Bun.sleep(500);
      return onlyTheSignIn();
    } finally {
      await touchEmulated(false);
    }
  });
  results.noNavigationSignedOut = wide && narrow && swipedOnAPhone;

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

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );
  results.bridgeIsThePortVerbs = same(
    (results.surface as { bridge: string[] }).bridge,
    Object.keys(BRIDGE_CHANNELS),
  );
}
