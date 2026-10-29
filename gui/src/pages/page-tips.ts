import type { MessageKey } from "@abth/i18n";

import type { Page } from "../navigation/pages";

/** What a tip opens to show it: the menu, Favourites' sets drawer or a set edited, a card. */
export const TIP_SCENES = ["menu", "sets", "editedSet", "knowItem"] as const;
export type TipScene = (typeof TIP_SCENES)[number];

/** A tip as one kind of screen shows it: where its bubble points, the first found, and its words. */
export interface TipFace {
  /** Selectors tried in order; none: the bubble stands at the window's top, pointing at nothing. */
  readonly at: readonly string[];
  readonly words: MessageKey;
  /** What the tip opens to show what it tells, shut again after it. */
  readonly scene?: TipScene;
  /** Told only where the navigation is a menu that opens, not a panel always beside the page. */
  readonly menuOnly?: true;
}

/** One thing nothing on screen shows, told once on a device, by the version that brought it. */
export interface Tip {
  readonly id: string;
  /** The page it is told on; the navigation's own on the Overview, once. */
  readonly page: Page;
  readonly since: string;
  /** How a touch screen tells it; none where a touch screen has nothing to tell. */
  readonly touch?: TipFace;
  /** How a computer's mouse and keys tell it; none where they have nothing to tell. */
  readonly mouse?: TipFace;
}

const READ_AGAIN = ["#read-again"];
const AT_THE_TOP: readonly string[] = [];
const FIRST_CARD = "#know-yourself-page .MuiCard-root";
/** The first set in the drawer, or the drawer where there is none yet. */
const FIRST_SET = ["#favorites-item-set-0", "#favorites-drawer"];
const both = (at: readonly string[], words: MessageKey) => ({
  touch: { at, words },
  mouse: { at, words },
});

/** Every tip, in the order a page tells them; the navigation's first, on the Overview. */
export const TIPS: readonly Tip[] = [
  {
    id: "app.menuSwipe",
    page: "overview",
    since: "0.7.0",
    touch: {
      at: [".MuiDrawer-modal nav"],
      words: "tips.app.menuSwipe",
      scene: "menu",
      menuOnly: true,
    },
  },
  {
    id: "app.readAgainKeys",
    page: "overview",
    since: "0.7.0",
    mouse: { at: READ_AGAIN, words: "tips.app.readAgainKeys" },
  },
  {
    id: "app.scan",
    page: "overview",
    since: "0.7.0",
    touch: { at: ["#scan"], words: "tips.app.scan", scene: "menu" },
    mouse: { at: ["#scan"], words: "tips.app.scan" },
  },
  {
    id: "overview.portrait",
    page: "overview",
    since: "0.7.0",
    touch: { at: ["#my-don"], words: "tips.overview.portrait.touch" },
    mouse: { at: ["#my-don"], words: "tips.overview.portrait.mouse" },
  },
  {
    id: "overview.readAgain",
    page: "overview",
    since: "0.7.0",
    touch: { at: AT_THE_TOP, words: "tips.overview.readAgain.touch" },
    mouse: { at: READ_AGAIN, words: "tips.overview.readAgain.mouse" },
  },
  {
    id: "overview.songSearch",
    page: "overview",
    since: "0.7.0",
    ...both(["#song-search"], "tips.overview.songSearch"),
  },
  {
    id: "overview.share",
    page: "overview",
    since: "0.7.0",
    ...both(["#overview-share"], "tips.overview.share"),
  },
  {
    id: "scores.readEvery",
    page: "scores",
    since: "0.7.0",
    touch: { at: AT_THE_TOP, words: "tips.scores.readEvery.touch" },
    mouse: { at: READ_AGAIN, words: "tips.scores.readEvery.mouse" },
  },
  {
    id: "scores.row",
    page: "scores",
    since: "0.7.0",
    touch: { at: ['#scores-list > li[data-index="0"]'], words: "tips.scores.row.touch" },
    mouse: { at: ['#scores-list > li[data-index="0"]'], words: "tips.scores.row.mouse" },
  },
  {
    id: "scores.filters",
    page: "scores",
    since: "0.7.0",
    touch: { at: ["#scores-difficulty"], words: "tips.scores.filters" },
  },
  {
    id: "rating.system",
    page: "rating",
    since: "0.7.0",
    ...both([".MuiToggleButtonGroup-root:has(#rating-system-ourtaikoV1)"], "tips.rating.system"),
  },
  {
    id: "rating.share",
    page: "rating",
    since: "0.7.0",
    ...both(["#rating-share"], "tips.rating.share"),
  },
  {
    id: "knowYourself.cards",
    page: "knowYourself",
    since: "0.7.0",
    touch: { at: [FIRST_CARD], words: "tips.knowYourself.cards", scene: "knowItem" },
    mouse: { at: [FIRST_CARD], words: "tips.knowYourself.cards", scene: "knowItem" },
  },
  {
    id: "costume.readAgain",
    page: "costume",
    since: "0.7.0",
    touch: { at: AT_THE_TOP, words: "tips.costume.readAgain.touch" },
    mouse: { at: READ_AGAIN, words: "tips.costume.readAgain.mouse" },
  },
  {
    id: "costume.history",
    page: "costume",
    since: "0.7.0",
    ...both(["#costume-history"], "tips.costume.history"),
  },
  {
    id: "nameTitle.readAgain",
    page: "nameTitle",
    since: "0.7.0",
    touch: { at: ["#title-plate"], words: "tips.nameTitle.readAgain.touch" },
    mouse: { at: READ_AGAIN, words: "tips.nameTitle.readAgain.mouse" },
  },
  {
    id: "favorites.setsDrawer",
    page: "favorites",
    since: "0.7.0",
    touch: { at: ["#favorites-drawer"], words: "tips.favorites.setsDrawer", scene: "sets" },
  },
  {
    id: "favorites.setMenu",
    page: "favorites",
    since: "0.7.0",
    touch: { at: FIRST_SET, words: "tips.favorites.setMenu.touch", scene: "sets" },
    mouse: { at: FIRST_SET, words: "tips.favorites.setMenu.mouse", scene: "sets" },
  },
  {
    id: "favorites.reorder",
    page: "favorites",
    since: "0.7.0",
    touch: {
      at: ["#favorite-set-songs > :first-child"],
      words: "tips.favorites.reorder.touch",
      scene: "editedSet",
    },
    mouse: {
      at: ["#favorite-set-songs .drag-handle"],
      words: "tips.favorites.reorder.mouse",
      scene: "editedSet",
    },
  },
  {
    id: "favorites.history",
    page: "favorites",
    since: "0.7.0",
    ...both(["#favorites-history"], "tips.favorites.history"),
  },
  {
    id: "favorites.gift",
    page: "favorites",
    since: "0.7.0",
    ...both(["#favorites-gift"], "tips.favorites.gift"),
  },
];

/** A tip as the bubble shows it on the screen in use. */
export interface DueTip extends TipFace {
  readonly id: string;
}

/** The window the tips are told in: how it is touched, and whether its navigation stays open. */
export interface TipScreen {
  readonly touchFirst: boolean;
  /** Wide enough for the side panel, which stays beside the page: no menu to open. */
  readonly wide: boolean;
}

/** The tips `page` tells on this screen that this device has not shown, in their order. */
export function dueTips(page: Page, screen: TipScreen, seen: ReadonlySet<string>): DueTip[] {
  return TIPS.flatMap((tip) => {
    const face = screen.touchFirst ? tip.touch : tip.mouse;
    if (face === undefined || (screen.wide && face.menuOnly === true)) {
      return [];
    }

    return tip.page === page && !seen.has(tip.id) ? [{ id: tip.id, ...face }] : [];
  });
}
