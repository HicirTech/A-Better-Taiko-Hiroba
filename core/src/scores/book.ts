import type { RecentPlay, ScoreListReading } from "../hiroba-dom-parser";
import {
  type Chart,
  GENRES,
  type Genre,
  type Level,
  mergeGenreIntoCatalogue,
  resolveSongTitle,
  type Score,
  type Song,
} from "../hiroba-models";
import type { RecentPlaysReading } from "../recent-plays";

/** A recent play no listed chart matches yet: its genre's list is read again for it. */
export interface UnlistedPlay {
  readonly songTitle: string;
  readonly genre: Genre;
  readonly level: Level;
}

/** One player's scores as the device keeps them. */
export interface ScoreBook {
  /** The songs the lists named, by Hiroba's own titles: what a recent play resolves against. */
  readonly songs: readonly Song[];
  /** Each chart's newest reading, by `chartKey`. */
  readonly scores: Readonly<Record<string, Score>>;
  /** Charts played since their last reading, by `chartKey`: their details are read again. */
  readonly stale: readonly string[];
  readonly unlisted: readonly UnlistedPlay[];
  /** All lists and all played charts are read next: none read yet, or a walk outran the feed. */
  readonly full: boolean;
}

/** One genre's list, as a read took it. */
export interface GenreList {
  readonly genre: Genre;
  readonly reading: ScoreListReading;
}

export const EMPTY_SCORE_BOOK: ScoreBook = {
  songs: [],
  scores: {},
  stale: [],
  unlisted: [],
  full: true,
};

export function chartKey(chart: Chart): string {
  return `${chart.songNo}/${chart.level}`;
}

/** The lists a read takes: all eight for a full read, else the unlisted plays' genres. */
export function genresToRead(book: ScoreBook): readonly Genre[] {
  if (book.full) {
    return GENRES;
  }
  return GENRES.filter((genre) => book.unlisted.some((play) => play.genre === genre));
}

/** The charts a read details: those played since, then any played chart never detailed. */
export function chartsToRead(book: ScoreBook): readonly Chart[] {
  const stale = new Set(book.stale);
  const undetailed = Object.entries(book.scores)
    .filter(([key, score]) => !stale.has(key) && score.crown !== "none" && score.record === null)
    .map(([, { songNo, level }]) => ({ songNo, level }))
    .sort(byChart);
  return [...book.stale.flatMap((key) => chartOfKey(book, key)), ...undetailed];
}

/** A song's charts as the lists name them, easiest first. */
export function songCharts(book: ScoreBook, songNo: string): readonly Chart[] {
  return Object.values(book.scores)
    .filter((score) => score.songNo === songNo)
    .sort(byChart)
    .map(({ level }) => ({ songNo, level }));
}

/** Each chart's place in recent plays, 0 the newest; a chart they no longer show has none. */
export function recentOrder(
  book: ScoreBook,
  plays: readonly RecentPlay[],
): ReadonlyMap<string, number> {
  const order = new Map<string, number>();
  plays.forEach((play, place) => {
    for (const key of chartKeysOf(book, play)) {
      if (!order.has(key)) {
        order.set(key, place);
      }
    }
  });
  return order;
}

/** Marks the charts a walk found played; a walk that outran the feed calls a full read. */
export function noteWalk(
  book: ScoreBook,
  walk: Pick<RecentPlaysReading, "fresh" | "stop">,
): ScoreBook {
  if (book.full) {
    return book;
  }
  if (walk.stop === "cap") {
    return { ...book, full: true };
  }
  const stale = new Set(book.stale);
  const unlisted = [...book.unlisted];
  for (const play of walk.fresh) {
    const keys = chartKeysOf(book, play);
    for (const key of keys) {
      stale.add(key);
    }
    if (keys.length === 0 && play.genre !== null && !unlisted.some(isPlayOf(play))) {
      unlisted.push({ songTitle: play.songTitle, genre: play.genre, level: play.level });
    }
  }
  return { ...book, stale: [...stale], unlisted };
}

/** Folds in a read's lists; a full read that took all eight reads every played chart again. */
export function foldLists(book: ScoreBook, lists: readonly GenreList[]): ScoreBook {
  const folded = lists.reduce((into, list) => foldList(into, list), book);
  if (!book.full || !GENRES.every((genre) => lists.some((list) => list.genre === genre))) {
    return folded;
  }
  const stale = new Set(folded.stale);
  for (const [key, score] of Object.entries(folded.scores)) {
    if (score.record !== null) {
      stale.add(key);
    }
  }
  return { ...folded, stale: [...stale], unlisted: [], full: false };
}

/** Folds in one chart's details, unless a newer reading is already kept. */
export function foldDetail(book: ScoreBook, score: Score): ScoreBook {
  const key = chartKey(score);
  const kept = book.scores[key];
  const scores =
    kept !== undefined && kept.fetchedAt > score.fetchedAt
      ? book.scores
      : { ...book.scores, [key]: score };
  return { ...book, scores, stale: book.stale.filter((each) => each !== key) };
}

/** A chart whose crown or rank moved since its details were read is read again. */
function foldList(book: ScoreBook, { genre, reading }: GenreList): ScoreBook {
  const scores = { ...book.scores };
  const stale = new Set(book.stale);
  for (const listed of reading.scores) {
    const key = chartKey(listed);
    const kept = scores[key];
    if (kept === undefined || kept.record === null) {
      scores[key] = listed;
    } else if (kept.crown !== listed.crown || kept.scoreRank !== listed.scoreRank) {
      stale.add(key);
    }
  }
  const songs = mergeGenreIntoCatalogue(book.songs, genre, reading.songs);
  const listed: ScoreBook = { ...book, songs, scores, stale: [...stale] };
  return resolveUnlisted(listed, genre);
}

/** The genre's unlisted plays, now that its list was read again: found, or forgotten. */
function resolveUnlisted(book: ScoreBook, genre: Genre): ScoreBook {
  const stale = new Set(book.stale);
  for (const play of book.unlisted.filter((one) => one.genre === genre)) {
    for (const key of chartKeysOf(book, play)) {
      stale.add(key);
    }
  }
  const unlisted = book.unlisted.filter((one) => one.genre !== genre);
  return { ...book, stale: [...stale], unlisted };
}

/** The listed charts a played title can be: one, each song sharing it, or none. */
function chartKeysOf(
  book: ScoreBook,
  play: Pick<RecentPlay, "songTitle" | "genre" | "level">,
): readonly string[] {
  const resolved = resolveSongTitle(book.songs, play.songTitle, play.genre);
  const songNos =
    resolved.outcome === "resolved"
      ? [resolved.songNo]
      : resolved.outcome === "ambiguous"
        ? resolved.candidates
        : [];
  return songNos
    .map((songNo) => chartKey({ songNo, level: play.level }))
    .filter((key) => Object.hasOwn(book.scores, key));
}

function chartOfKey(book: ScoreBook, key: string): readonly Chart[] {
  const score = book.scores[key];
  return score === undefined ? [] : [{ songNo: score.songNo, level: score.level }];
}

const isPlayOf =
  (play: Pick<RecentPlay, "songTitle" | "genre" | "level">) =>
  (one: UnlistedPlay): boolean =>
    one.songTitle === play.songTitle && one.genre === play.genre && one.level === play.level;

function byChart(left: Chart, right: Chart): number {
  return Number(left.songNo) - Number(right.songNo) || left.level - right.level;
}
