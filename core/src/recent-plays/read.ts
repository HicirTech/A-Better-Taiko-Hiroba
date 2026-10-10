import type { RecentPlay } from "../hiroba-dom-parser";
import { err, isErr, ok, type Result } from "../operation-results";

/** Five rows a page, and the feed's last real page is 200: 1000 charts. */
export const RECENT_PLAYS_PAGE_SIZE = 5;
export const RECENT_PLAYS_PAGE_CAP = 200;
export const RECENT_PLAYS_CAP = RECENT_PLAYS_PAGE_SIZE * RECENT_PLAYS_PAGE_CAP;

/** Why a walk stopped. `cap` is the 200-page ceiling, not a sign the feed ended. */
export type RecentPlaysStop = "known" | "clamped" | "short" | "cap";

export interface RecentPlaysReading {
  readonly plays: readonly RecentPlay[];
  readonly pagesFetched: number;
  readonly stop: RecentPlaysStop;
}

export interface RecentPlaysReadDeps<F> {
  fetchPage(page: number): Promise<Result<readonly RecentPlay[], F>>;
  /** The last walk's rows, newest first. Null or empty is a first read: walk to the cap. */
  readonly previous: readonly RecentPlay[] | null;
  /** Defaults to {@link RECENT_PLAYS_PAGE_CAP}. */
  readonly pageCap?: number;
  /** Pages asked at a time after page 1, which goes alone. Defaults to 1. */
  readonly atOnce?: number;
  /** Called as a page's request starts, so a caller can show which page is in flight. */
  onPage?(page: number): void;
}

/** A walk that failed, at the page whose request failed. */
export interface RecentPlaysPageFailure<F> {
  readonly page: number;
  readonly failure: F;
}

/** A row's whole record. An unchanged row is one the last walk already stored. */
export function recentPlayKey(play: RecentPlay): string {
  const { record } = play;
  const { options } = record;
  return JSON.stringify([
    play.songTitle,
    play.genre,
    play.level,
    play.crown,
    play.scoreRank,
    record.highScore,
    record.good,
    record.ok,
    record.bad,
    record.drumroll,
    record.maxCombo,
    record.stageCount,
    record.clearCount,
    record.fullComboCount,
    record.donderfulComboCount,
    options.speed,
    options.doron,
    options.abekobe,
    options.random,
    options.supportChart,
  ]);
}

/** Title, genre and level: the page's only identity. Two songs can share it. */
function chartKey(play: RecentPlay): string {
  return JSON.stringify([play.songTitle, play.genre, play.level]);
}

/** New rows first, then the previous tail less what they replaced, capped at the feed's 1000. */
export function mergeRecentPlays(
  fresh: readonly RecentPlay[],
  previous: readonly RecentPlay[] | null,
): readonly RecentPlay[] {
  if (previous === null || previous.length === 0) {
    return fresh.slice(0, RECENT_PLAYS_CAP);
  }
  const moved = new Set(fresh.map(chartKey));
  const tail = previous.filter((row) => !moved.has(chartKey(row)));
  return [...fresh, ...tail].slice(0, RECENT_PLAYS_CAP);
}

/** Walks the feed from page 1. A later walk stops at the first row the last walk stored: a replay
 * changes a row's record and moves it up, so new rows sit above that row. */
export async function readRecentPlays<F>(
  deps: RecentPlaysReadDeps<F>,
): Promise<Result<RecentPlaysReading, RecentPlaysPageFailure<F>>> {
  const pageCap = deps.pageCap ?? RECENT_PLAYS_PAGE_CAP;
  const atOnce = deps.atOnce ?? 1;
  const walk = walkFrom(deps.previous, pageCap);
  const answers = new Map<number, Promise<Result<readonly RecentPlay[], F>>>();
  const ask = (page: number) => {
    deps.onPage?.(page);
    const answer = deps.fetchPage(page);
    answers.set(page, answer);
    return answer;
  };

  let walked: Result<RecentPlaysReading, RecentPlaysPageFailure<F>> | null = null;
  let page = 0;
  while (walked === null) {
    page += 1;
    const answer = answers.get(page) ?? ask(page);
    // Page 1 goes alone, since a later walk mostly stops on it.
    const last = page === 1 ? 1 : Math.min(page + atOnce - 1, pageCap);
    for (let ahead = page + 1; ahead <= last; ahead += 1) {
      if (!answers.has(ahead)) {
        ask(ahead);
      }
    }
    const rows = await answer;
    if (isErr(rows)) {
      walked = err({ page, failure: rows.error });
    } else {
      const stop = walk.took(page, rows.value);
      walked = stop === null ? null : ok({ plays: walk.plays(), pagesFetched: page, stop });
    }
  }
  // Pages asked past the stop end before the walk does; nothing of them is kept.
  await Promise.allSettled(answers.values());
  return walked;
}

/** Takes a walk's pages in order, and says where it stops. */
function walkFrom(previous: readonly RecentPlay[] | null, pageCap: number) {
  const known =
    previous === null || previous.length === 0 ? null : new Set(previous.map(recentPlayKey));
  const fresh: RecentPlay[] = [];
  let pageOne: readonly string[] = [];

  const took = (page: number, rows: readonly RecentPlay[]): RecentPlaysStop | null => {
    const keys = rows.map(recentPlayKey);
    // page>=201 is page 1 again, and a shorter feed may clamp earlier. The duplicate is not data.
    if (page > 1 && same(keys, pageOne)) {
      return "clamped";
    }
    if (page === 1) {
      pageOne = keys;
    }
    if (known !== null) {
      const hit = keys.findIndex((key) => known.has(key));
      if (hit >= 0) {
        fresh.push(...rows.slice(0, hit));
        return "known";
      }
    }
    fresh.push(...rows);
    if (rows.length < RECENT_PLAYS_PAGE_SIZE) {
      return "short";
    }
    return page >= pageCap ? "cap" : null;
  };
  return { took, plays: () => mergeRecentPlays(fresh, previous) };
}

function same(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}
