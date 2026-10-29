import { describe, expect, test } from "bun:test";

import { PAGES } from "../src/navigation/pages";
import { dueTips, TIPS } from "../src/pages/page-tips";
import { keepSeenTips, keptSeenTips, SEEN_TIPS_KEY } from "../src/shared/tips/seen-tips";

const idsOf = (tips: readonly { readonly id: string }[]) => tips.map(({ id }) => id);
const PHONE = { touchFirst: true, wide: false };
const TABLET = { touchFirst: true, wide: true };
const COMPUTER = { touchFirst: false, wide: true };

/** A store as the page's: strings by key. */
function storage(): Storage {
  const kept = new Map<string, string>();
  return {
    get length() {
      return kept.size;
    },
    clear: () => kept.clear(),
    getItem: (key) => kept.get(key) ?? null,
    key: (index) => [...kept.keys()][index] ?? null,
    removeItem: (key) => {
      kept.delete(key);
    },
    setItem: (key, value) => {
      kept.set(key, value);
    },
  };
}

describe("TIPS", () => {
  test("names each tip once, each told on some screen, on a page the navigation lists or the whole app", () => {
    expect(new Set(idsOf(TIPS)).size).toBe(TIPS.length);
    for (const tip of TIPS) {
      expect(tip.touch !== undefined || tip.mouse !== undefined).toBe(true);
      expect(tip.page === null || PAGES.includes(tip.page)).toBe(true);
      expect(tip.since).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("dueTips", () => {
  test("tells the whole app's tips first, then the page's, each for the screen in use", () => {
    expect(idsOf(dueTips("overview", PHONE, new Set()))).toEqual([
      "app.menuSwipe",
      "app.scan",
      "overview.portrait",
      "overview.readAgain",
      "overview.songSearch",
      "overview.share",
    ]);
    expect(idsOf(dueTips("overview", COMPUTER, new Set()))).toEqual([
      "app.readAgainKeys",
      "app.scan",
      "overview.portrait",
      "overview.readAgain",
      "overview.songSearch",
      "overview.share",
    ]);
  });

  test("tells the navigation's tips on the Overview alone, once", () => {
    for (const page of PAGES.filter((one) => one !== "overview")) {
      expect(idsOf(dueTips(page, PHONE, new Set())).filter((id) => id.startsWith("app."))).toEqual(
        [],
      );
    }
  });

  test("tells the menu's swipe only where the navigation is a menu, and opens it for the scan", () => {
    const navigation = (screen: typeof PHONE) =>
      dueTips("overview", screen, new Set()).filter(({ id }) => id.startsWith("app."));
    expect(idsOf(navigation(TABLET))).toEqual(["app.scan"]);
    const [swipe, scan] = navigation(PHONE);
    expect(swipe?.scene).toBe("menu");
    expect(scan).toMatchObject({ id: "app.scan", at: ["#scan"], scene: "menu" });
  });

  test("gives a tip's words and places as the screen in use tells it", () => {
    const [touch] = dueTips("nameTitle", PHONE, new Set(["app.menuSwipe", "app.scan"]));
    const [mouse] = dueTips("nameTitle", COMPUTER, new Set(["app.readAgainKeys", "app.scan"]));
    expect(touch).toEqual({
      id: "nameTitle.readAgain",
      at: ["#title-plate"],
      words: "tips.nameTitle.readAgain.touch",
    });
    expect(mouse).toEqual({
      id: "nameTitle.readAgain",
      at: ["#read-again"],
      words: "tips.nameTitle.readAgain.mouse",
    });
  });

  test("leaves out every tip seen, so a newer version's tip comes alone where the rest were seen", () => {
    const older = new Set(idsOf(TIPS).filter((id) => id !== "favorites.gift"));
    expect(idsOf(dueTips("favorites", COMPUTER, older))).toEqual(["favorites.gift"]);
    expect(dueTips("favorites", COMPUTER, new Set(idsOf(TIPS)))).toEqual([]);
  });
});

describe("the tips seen on this device", () => {
  test("are kept once each, added to what was kept", () => {
    const store = storage();
    keepSeenTips(["app.scan", "overview.share"], store);
    keepSeenTips([...keptSeenTips(store), "overview.share", "rating.share"], store);
    expect([...keptSeenTips(store)]).toEqual(["app.scan", "overview.share", "rating.share"]);
  });

  test("read as none where nothing, or nothing readable, is kept", () => {
    const store = storage();
    expect(keptSeenTips(store).size).toBe(0);
    store.setItem(SEEN_TIPS_KEY, "{not json");
    expect(keptSeenTips(store).size).toBe(0);
    store.setItem(SEEN_TIPS_KEY, JSON.stringify(["app.scan", 7, null]));
    expect([...keptSeenTips(store)]).toEqual(["app.scan"]);
  });
});
