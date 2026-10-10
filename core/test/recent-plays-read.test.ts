import { describe, expect, test } from "bun:test";

import { isErr, isOk, type RecentPlay, readRecentPlays, recentPlayKey } from "../src/index";

function play(title: string, score = 1000): RecentPlay {
  return {
    songTitle: title,
    genre: 1,
    level: 4,
    crown: "silver",
    scoreRank: 5,
    record: {
      highScore: score,
      good: 10,
      ok: 1,
      bad: 0,
      drumroll: 2,
      maxCombo: 8,
      stageCount: 1,
      clearCount: 1,
      fullComboCount: 0,
      donderfulComboCount: 0,
      options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
    },
  };
}

/** Five rows a page, named so a test can see which page a row came from. */
function pageOf(page: number, count = 5): RecentPlay[] {
  return Array.from({ length: count }, (_, index) => play(`p${page}-${index}`));
}

function feed(pages: readonly (readonly RecentPlay[])[]) {
  const asked: number[] = [];
  let inFlight = 0;
  let peak = 0;
  const fetchPage = async (page: number) => {
    asked.push(page);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await Promise.resolve();
    inFlight -= 1;
    const rows = pages[page - 1];
    return rows === undefined
      ? { ok: false as const, error: "missing" }
      : { ok: true as const, value: rows };
  };
  return { asked, peak: () => peak, inFlight: () => inFlight, fetchPage };
}

describe("readRecentPlays", () => {
  test("a first read walks every page up to the cap, one page at a time", async () => {
    const pages = [pageOf(1), pageOf(2), pageOf(3), pageOf(4)];
    const source = feed(pages);
    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: null, pageCap: 4 });
    expect(isOk(read) && read.value.stop).toBe("cap");
    expect(isOk(read) && read.value.pagesFetched).toBe(4);
    expect(isOk(read) && read.value.plays.map((row) => row.songTitle)).toEqual(
      pages.flat().map((row) => row.songTitle),
    );
    expect(source.asked).toEqual([1, 2, 3, 4]);
    expect(source.peak()).toBe(1);
  });

  test("asks page 1 alone, then up to three pages at a time, and takes them in order", async () => {
    const pages = [pageOf(1), pageOf(2), pageOf(3), pageOf(4), pageOf(5), pageOf(6, 1)];
    const source = feed(pages);

    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: null, atOnce: 3 });

    expect(isOk(read) && read.value.stop).toBe("short");
    expect(isOk(read) && read.value.plays.map((row) => row.songTitle)).toEqual(
      pages.flat().map((row) => row.songTitle),
    );
    expect(source.asked).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(source.peak()).toBe(3);
  });

  test("a later walk that stops on page 1 asks for nothing more", async () => {
    const kept = pageOf(1);
    const source = feed([kept, pageOf(2)]);

    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: kept, atOnce: 3 });

    expect(isOk(read) && read.value.stop).toBe("known");
    expect(source.asked).toEqual([1]);
  });

  test("never asks past the cap, however many pages go at once", async () => {
    const source = feed([pageOf(1), pageOf(2), pageOf(3)]);

    const read = await readRecentPlays({
      fetchPage: source.fetchPage,
      previous: null,
      pageCap: 3,
      atOnce: 3,
    });

    expect(isOk(read) && read.value.stop).toBe("cap");
    expect(source.asked).toEqual([1, 2, 3]);
  });

  test("ends only once the pages asked past the stop have answered", async () => {
    const source = feed([pageOf(1), pageOf(2, 2), pageOf(3), pageOf(4)]);

    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: null, atOnce: 3 });

    expect(isOk(read) && read.value.plays).toHaveLength(7);
    expect(source.asked).toEqual([1, 2, 3, 4]);
    expect(source.inFlight()).toBe(0);
  });

  test("names each page as its request starts", async () => {
    const events: string[] = [];
    const source = feed([pageOf(1), pageOf(2, 3)]);
    await readRecentPlays({
      fetchPage: (page) => {
        events.push(`fetch ${page}`);
        return source.fetchPage(page);
      },
      previous: null,
      onPage: (page) => events.push(`page ${page}`),
    });
    expect(events).toEqual(["page 1", "fetch 1", "page 2", "fetch 2"]);
  });

  test("stops when a later page is page 1 again, and does not store the duplicate", async () => {
    const first = pageOf(1);
    const source = feed([first, pageOf(2), first]);
    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: null });
    expect(isOk(read) && read.value.stop).toBe("clamped");
    expect(isOk(read) && read.value.plays).toHaveLength(10);
    expect(source.asked).toEqual([1, 2, 3]);
  });

  test("stops on a short page, which is the end of a shorter feed", async () => {
    const source = feed([pageOf(1), pageOf(2, 2)]);
    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: null });
    expect(isOk(read) && read.value.stop).toBe("short");
    expect(isOk(read) && read.value.plays).toHaveLength(7);
    expect(source.asked).toEqual([1, 2]);
  });

  test("a later read stops at the first unchanged row, keeping what was played above it", async () => {
    const older = play("older");
    const kept = [play("old-head"), older];
    const replayed = play("old-head", 2000);
    const added = play("new");
    const source = feed([[added, replayed, older], pageOf(2)]);
    const read = await readRecentPlays({ fetchPage: source.fetchPage, previous: kept });
    expect(isOk(read) && read.value.stop).toBe("known");
    expect(isOk(read) && read.value.pagesFetched).toBe(1);
    expect(isOk(read) && read.value.plays.map((row) => row.songTitle)).toEqual([
      "new",
      "old-head",
      "older",
    ]);
    expect(isOk(read) && read.value.plays[1]?.record.highScore).toBe(2000);
    expect(source.asked).toEqual([1]);
  });

  test("does not stop on a replayed head, which would hide a chart played before that replay", async () => {
    const head = play("head");
    const below = play("below");
    const source = feed([[play("head", 3000), play("between"), below]]);
    const read = await readRecentPlays({
      fetchPage: source.fetchPage,
      previous: [head, below],
      pageCap: 5,
    });
    expect(isOk(read) && read.value.stop).toBe("known");
    expect(
      isOk(read) && read.value.plays.map((row) => [row.songTitle, row.record.highScore]),
    ).toEqual([
      ["head", 3000],
      ["between", 1000],
      ["below", 1000],
    ]);
  });

  test("returns the failure with the page it failed at, and keeps no part of the walk", async () => {
    const source = feed([pageOf(1), pageOf(2), pageOf(3), pageOf(4)]);

    const read = await readRecentPlays({
      fetchPage: async (page) =>
        page === 3 ? { ok: false as const, error: "loggedOut" } : source.fetchPage(page),
      previous: null,
      atOnce: 3,
    });

    expect(isErr(read) && read.error).toEqual({ page: 3, failure: "loggedOut" });
    expect(source.inFlight()).toBe(0);
  });

  test("two rows with the same record share a key", () => {
    expect(recentPlayKey(play("same"))).toBe(recentPlayKey(play("same")));
    expect(recentPlayKey(play("same"))).not.toBe(recentPlayKey(play("same", 2)));
  });
});
