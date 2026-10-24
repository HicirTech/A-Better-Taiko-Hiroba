import { describe, expect, test } from "bun:test";

import { pageWaiting } from "../src/app/page-waiting";
import { PAGES, type Page } from "../src/navigation/pages";
import { PAGE_MODELS, type PageState } from "../src/pages/page-model";

/** A page's state with only what a test names; each read records itself in `calls`. */
function pageState(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const call =
    (name: string, answer: unknown = undefined) =>
    () => {
      calls.push(name);
      return answer;
    };
  const reads = (name: string) => ({
    load: call(`${name}.load`),
    read: call(`${name}.read`, Promise.resolve()),
    markStale: call(`${name}.markStale`),
    reading: false,
    canRead: true,
  });
  const state = {
    writing: false,
    session: {
      screen: { name: "profile" },
      myPageInView: false,
      read: call("myPage.read", Promise.resolve(true)),
    },
    history: { ...reads("plays"), plays: [], page: null },
    scores: { ...reads("scores"), view: { scores: [] }, song: null, progress: null },
    ratingData: { ...reads("ratingData"), data: null, failure: null },
    catalogue: { state: "ready", readIfFailed: call("songList.readIfFailed") },
    listed: { charts: [] },
    editor: { ...reads("costume"), step: { name: "editing" }, dropEdits: call("costume.drop") },
    favorites: {
      ...reads("favorites"),
      step: { name: "ready" },
      dropEdits: call("favorites.drop"),
    },
    keptSets: { reload: call("sets.reload") },
    titleEditor: { dropEdits: call("title.drop"), forgetList: call("titles.forget") },
    nameEditor: { dropEdits: call("name.drop") },
    pickable: { markStale: call("pickable.markStale") },
    ...overrides,
  } as unknown as PageState;
  return { state, calls };
}

describe("PAGE_MODELS", () => {
  test("lists every page in the navigation by its own name", () => {
    for (const page of PAGES) {
      expect(PAGE_MODELS[page].label).toBe(`nav.${page}`);
    }
  });

  test("reads a day-old song list again on Read again only where a page names songs", () => {
    const naming = PAGES.filter((page) => PAGE_MODELS[page].namesSongs);
    expect(naming).toEqual([
      "overview",
      "history",
      "scores",
      "rating",
      "knowYourself",
      "favorites",
    ]);
  });

  test("reads the song list once a page that shows it opens", () => {
    const showing = PAGES.filter((page) => PAGE_MODELS[page].needsSongs);
    expect(showing).toEqual(["history", "scores", "rating", "knowYourself", "favorites"]);
  });

  type OpensCase = [page: Page, reads: readonly string[]];
  test.each<OpensCase>([
    ["overview", []],
    ["history", ["plays.load", "scores.load", "sets.reload"]],
    ["scores", ["scores.load"]],
    ["rating", ["scores.load", "ratingData.load"]],
    ["knowYourself", ["scores.load", "songList.readIfFailed", "sets.reload"]],
    ["costume", []],
    ["nameTitle", []],
    ["favorites", []],
    ["settings", []],
  ])("opens %s with the reads it shows: %p", (page, reads) => {
    const { state, calls } = pageState();

    for (const load of PAGE_MODELS[page].opens?.(state) ?? []) {
      load();
    }

    expect(calls).toEqual([...reads]);
  });

  test("waits on Rating's first visit until its data is read, or has failed", () => {
    const rating = PAGE_MODELS.rating;

    expect(rating.waits(pageState().state)).toBe(true);
    expect(
      rating.waits(pageState({ ratingData: { data: null, failure: "unreachable" } }).state),
    ).toBe(false);
  });

  test("starts an editor's first read only while it is unread and no write runs", () => {
    const unread = { step: { name: "unread" }, read: () => Promise.resolve() };

    expect(PAGE_MODELS.costume.firstRead?.(pageState({ editor: unread }).state)).toBe(unread.read);
    expect(
      PAGE_MODELS.costume.firstRead?.(pageState({ editor: unread, writing: true }).state),
    ).toBeNull();
    expect(PAGE_MODELS.costume.firstRead?.(pageState().state)).toBeNull();
  });

  type ReadAgainCase = [page: Page, reads: readonly string[]];
  test.each<ReadAgainCase>([
    ["overview", ["myPage.read"]],
    ["history", ["plays.read", "scores.markStale"]],
    ["scores", ["scores.read", "plays.markStale"]],
    ["rating", ["scores.read", "ratingData.read", "plays.markStale"]],
    ["knowYourself", ["scores.read", "plays.markStale"]],
    ["costume", ["costume.read"]],
    ["nameTitle", ["myPage.read", "titles.forget"]],
    ["favorites", ["pickable.markStale", "favorites.read"]],
    ["settings", ["myPage.read"]],
  ])("reads again on %s what it shows, each once: %p", async (page, reads) => {
    const { state, calls } = pageState();

    await PAGE_MODELS[page].readAgain(state);
    await Promise.resolve();

    expect(calls).toEqual([...reads]);
  });

  test("turns Rating's button for its rating data too, yet waits only for its scores", () => {
    const { state } = pageState({
      scores: { reading: false, canRead: true },
      ratingData: { reading: true },
    });

    expect(PAGE_MODELS.rating.follows?.(state)).toEqual({ reading: true, canRead: true });
  });

  test("drops only a page's own edits as another page opens", () => {
    const { state, calls } = pageState();

    for (const page of PAGES) {
      for (const drop of PAGE_MODELS[page].leaves?.(state) ?? []) {
        drop();
      }
    }

    expect(calls).toEqual(["costume.drop", "title.drop", "name.drop", "favorites.drop"]);
  });

  test("asks before reading every score or play again only where some are kept", () => {
    const kept = pageState({
      scores: { view: { scores: [{}] } },
      history: { plays: [{}] },
    }).state;
    const none = pageState().state;

    expect(PAGES.filter((page) => PAGE_MODELS[page].readsEvery?.can(kept))).toEqual([
      "history",
      "scores",
    ]);
    expect(PAGES.filter((page) => PAGE_MODELS[page].readsEvery?.can(none))).toEqual([]);
  });
});

describe("pageWaiting", () => {
  type WaitingCase = [
    screen: "checking" | "reading" | "profile" | "readFailed" | "signedOut",
    standsAlone: boolean,
    firstRead: boolean,
    reading: boolean,
    waits: boolean,
    holds: boolean,
  ];
  test.each<WaitingCase>([
    ["checking", false, false, false, true, false],
    ["reading", false, false, false, true, false],
    ["profile", false, true, false, true, false],
    ["profile", false, false, true, true, true],
    ["profile", false, false, false, false, true],
    ["readFailed", false, false, false, false, false],
    ["signedOut", false, false, false, false, false],
    ["reading", true, true, true, false, false],
  ])(
    "on %s, standing alone %p, first read %p, reading %p: waits %p, holds %p",
    (screen, standsAlone, firstRead, reading, waits, holds) => {
      expect(pageWaiting(screen, standsAlone, firstRead, reading)).toEqual({ waits, holds });
    },
  );
});
