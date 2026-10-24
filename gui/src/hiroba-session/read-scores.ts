import {
  askedInFull,
  type Chart,
  chartKey,
  chartsToRead,
  EMPTY_SCORE_BOOK,
  err,
  foldDetail,
  foldLists,
  type Genre,
  type GenreList,
  genresToRead,
  isErr,
  logDetail,
  notePlayedSong,
  noteWalk as noteWalkInBook,
  ok,
  parseScoreDetailPage,
  parseScoreListPage,
  type RecentPlay,
  type RecentPlaysReading,
  type Result,
  readHirobaPage,
  recentOrder,
  type Score,
  type ScoreBook,
  type ScoreChangeLog,
  songCharts,
  startingLog,
  withBaseline,
} from "@abth/core";

import { type Pipeline, resultFailure, SCORE_READ_CONSUMERS } from "../shared/pipelines";
import type {
  ListedChartsView,
  PlayedChart,
  RecentPlaysFailure,
  ScoresFailure,
  ScoresProgress,
  ScoresRead,
  ScoresView,
  ScoreView,
} from "../shared/session-port";
import { listedChartsOf } from "./listed-charts";
import type { ScoreChangesStore } from "./score-changes-store";
import type { ScoresStore } from "./scores-store";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints } from "./types";

/** A genre's list, read in Hiroba's IO pipeline; its subject is the genre. */
export const SCORE_LIST_OPERATION = "scoreList";
/** A chart's details, read in the scores pipeline; its subject is the chart, `songNo/level`. */
export const SCORE_DETAIL_OPERATION = "scoreDetail";

/** Details folded in between two saves of the book, so a read that stops keeps most of its work. */
const DETAILS_PER_SAVE = 25;

export interface ScoresReader {
  /** The kept scores. Asks Hiroba nothing. */
  scores(): Promise<ScoresView>;
  /** Every chart the lists name, played or not. Asks Hiroba nothing. */
  listedCharts(): Promise<ListedChartsView>;
  /** The walk, the lists the book needs, then the details left; a second call shares it. */
  readScores(): Promise<Result<ScoresRead, ScoresFailure>>;
  /** As `readScores`, but every list, then every played chart, as the first read takes them. */
  readEveryScore(): Promise<Result<ScoresRead, ScoresFailure>>;
  /** The song's listed charts and the played one; a song no list named yet is taken in. */
  readSongScores(
    songNo: string,
    played: PlayedChart | null,
  ): Promise<Result<ScoresRead, ScoresFailure>>;
  scoresProgress(): Promise<ScoresProgress | null>;
  /** Marks the charts a walk of recent plays found played, whichever page walked. */
  noteWalk(taikoNo: string, walk: RecentPlaysReading): Promise<void>;
}

export interface ScoresReaderOptions {
  readonly endpoints: HirobaEndpoints;
  /** Hiroba's IO pipeline: a list carries a form token, so it never lands inside a write. */
  readonly io: Pick<Pipeline, "read">;
  /** The scores pipeline: each chart's details are a read group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  readonly store: ScoresStore;
  /** What each read changes, kept per player beside the book. */
  readonly changes: ScoreChangesStore;
  readonly owner: () => string | null;
  readonly endSession: () => void | Promise<void>;
  /** Walks recent plays as their page does; the walk notes what it found here itself. */
  readonly walk: () => Promise<Result<RecentPlaysReading, RecentPlaysFailure>>;
  readonly walkProgress: () => Promise<number | null>;
  /** The recent plays kept on the device, newest first: the order the page can sort by. */
  readonly recentPlays: () => Promise<readonly RecentPlay[]>;
}

/** The port's five verbs, the same on every shell. */
export function createScoresReader(options: ScoresReaderOptions): ScoresReader {
  const { endpoints, owner } = options;
  const books = createBooks(options.store, options.changes);
  let progress: ScoresProgress | null = null;
  let running: Promise<Result<ScoresRead, ScoresFailure>> | null = null;

  const failed = async (failure: ScoresFailure): Promise<Result<never, ScoresFailure>> => {
    if (sessionEnded(failure)) {
      await options.endSession();
    }
    return err(failure);
  };

  const readLists = async (
    taikoNo: string,
    genres: readonly Genre[],
  ): Promise<ScoresFailure | null> => {
    if (genres.length === 0) {
      return null;
    }
    let done = 0;
    progress = { step: "lists", done, total: genres.length };
    const fetchedAt = new Date().toISOString();
    const answers = await Promise.all(
      genres.map(async (genre) => {
        const answer = await options.io.read(
          { operation: SCORE_LIST_OPERATION, subject: String(genre), failureOf: resultFailure },
          (transport) =>
            readHirobaPage(
              { transport, hirobaOrigin: endpoints.hirobaOrigin },
              `score_list.php?genre=${genre}`,
              (html) => parseScoreListPage(html, taikoNo, genre, fetchedAt),
            ),
        );
        done += 1;
        progress = { step: "lists", done, total: genres.length };
        return { genre, answer };
      }),
    );
    const lists: GenreList[] = answers.flatMap(({ genre, answer }) =>
      answer.ok ? [{ genre, reading: answer.value }] : [],
    );
    await books.change(taikoNo, (book) => foldLists(book, lists));
    await books.save(taikoNo);
    for (const { genre, answer } of answers) {
      if (!answer.ok) {
        return { ...answer.error, at: { kind: "list", genre } };
      }
    }
    return null;
  };

  const readDetail = (taikoNo: string, { songNo, level }: Chart) =>
    options.pipeline.read(
      {
        operation: SCORE_DETAIL_OPERATION,
        subject: chartKey({ songNo, level }),
        failureOf: resultFailure,
      },
      (transport) =>
        readHirobaPage(
          { transport, hirobaOrigin: endpoints.hirobaOrigin },
          `score_detail.php?song_no=${songNo}&level=${level}`,
          (html) => parseScoreDetailPage(html, taikoNo, songNo, level, new Date().toISOString()),
        ),
    );

  /** Up to the pipeline's consumers at once; the first failure stops the rest from starting. */
  const readDetails = async (
    taikoNo: string,
    charts: readonly Chart[],
    told: (done: number) => void,
  ): Promise<ScoresFailure | null> => {
    const stop: { failure: ScoresFailure | null } = { failure: null };
    const titles = new Map(
      (await books.of(taikoNo)).songs.map((song) => [song.songNo, song.title]),
    );
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (stop.failure === null) {
        const chart = charts[next];
        if (chart === undefined) {
          return;
        }
        next += 1;
        const answer = await readDetail(taikoNo, chart);
        if (!answer.ok) {
          const { songNo, level } = chart;
          const songTitle = titles.get(songNo) ?? null;
          stop.failure ??= { ...answer.error, at: { kind: "detail", songNo, songTitle, level } };
          return;
        }
        await books.fold(taikoNo, answer.value);
        done += 1;
        told(done);
        if (done % DETAILS_PER_SAVE === 0) {
          await books.save(taikoNo);
        }
      }
    };
    await Promise.all(Array.from({ length: SCORE_READ_CONSUMERS }, worker));
    await books.save(taikoNo);
    return stop.failure;
  };

  const readAll = async (): Promise<Result<ScoresRead, ScoresFailure>> => {
    const taikoNo = owner();
    if (taikoNo === null) {
      return err({ kind: "notSignedIn" });
    }
    progress = { step: "recentPlays", page: 1 };
    const walked = await options.walk();
    if (isErr(walked)) {
      // The walk has ended the session itself if a page found it over.
      const { page, ...failure } = walked.error;
      return err(page === undefined ? failure : { ...failure, at: { kind: "recentPlays", page } });
    }
    const listed = await readLists(taikoNo, genresToRead(await books.of(taikoNo)));
    if (listed !== null) {
      return failed(listed);
    }
    const charts = chartsToRead(await books.of(taikoNo));
    progress = { step: "details", done: 0, total: charts.length };
    const detailed = await readDetails(taikoNo, charts, (done) => {
      progress = { step: "details", done, total: charts.length };
    });
    if (detailed !== null) {
      return failed(detailed);
    }
    await books.baseline(taikoNo);
    return readOf(taikoNo, charts);
  };

  // One read of all at a time: a second ask shares the one running.
  const once = (read: () => Promise<Result<ScoresRead, ScoresFailure>>) => {
    running ??= read().finally(() => {
      running = null;
      progress = null;
    });
    return running;
  };

  const viewNow = async (taikoNo: string) =>
    viewOf(await books.of(taikoNo), await options.recentPlays());
  const readOf = async (taikoNo: string, charts: readonly Chart[]) =>
    ok({ ...(await viewNow(taikoNo)), detailed: charts.length });

  return {
    async scores() {
      const taikoNo = owner();
      return taikoNo === null ? viewOf(EMPTY_SCORE_BOOK, []) : viewNow(taikoNo);
    },
    async listedCharts() {
      const taikoNo = owner();
      return listedChartsOf(taikoNo === null ? EMPTY_SCORE_BOOK : await books.of(taikoNo));
    },
    readScores: () => once(readAll),
    readEveryScore: () =>
      once(async () => {
        const taikoNo = owner();
        if (taikoNo !== null) {
          await books.change(taikoNo, askedInFull);
          await books.save(taikoNo);
        }
        return readAll();
      }),
    async readSongScores(songNo, played) {
      const taikoNo = owner();
      if (taikoNo === null) {
        return err({ kind: "notSignedIn" });
      }
      if (played !== null) {
        const { title, genre } = played;
        const genres = genre === null ? [] : [genre];
        await books.change(taikoNo, (book) => notePlayedSong(book, { songNo, title, genres }));
      }
      const listed = songCharts(await books.of(taikoNo), songNo);
      const charts =
        played === null || listed.some(({ level }) => level === played.level)
          ? listed
          : [...listed, { songNo, level: played.level }];
      const detailed = await readDetails(taikoNo, charts, () => undefined);
      return detailed === null ? readOf(taikoNo, charts) : failed(detailed);
    },
    async scoresProgress() {
      if (progress?.step !== "recentPlays") {
        return progress;
      }
      return { step: "recentPlays", page: (await options.walkProgress()) ?? 1 };
    },
    async noteWalk(taikoNo, walk) {
      await books.change(taikoNo, (book) => noteWalkInBook(book, walk));
      await books.save(taikoNo);
    },
  };
}

/** A player's book and log of changes, as last loaded or changed. */
interface Kept {
  book: ScoreBook;
  log: ScoreChangeLog;
  /** The log as last written: none until a first save writes one. */
  savedLog: ScoreChangeLog | null;
}

/** Each player's book and log, loaded once and changed in place; saves go one after another. */
function createBooks(store: ScoresStore, changes: ScoreChangesStore) {
  const kept = new Map<string, Kept>();
  const loads = new Map<string, Promise<Kept>>();
  let saving: Promise<void> = Promise.resolve();

  const held = (taikoNo: string): Promise<Kept> => {
    let load = loads.get(taikoNo);
    if (load === undefined) {
      load = Promise.all([store.load(taikoNo), changes.load(taikoNo)]).then(
        ([book, log]) => {
          const one = { book, log: log ?? startingLog(book), savedLog: log };
          kept.set(taikoNo, one);
          return one;
        },
        (error: unknown) => {
          loads.delete(taikoNo);
          throw error;
        },
      );
      loads.set(taikoNo, load);
    }
    return load;
  };
  // The log goes first: a book written without its rows would read the same chart as unchanged.
  const save = (taikoNo: string): Promise<void> => {
    const saved = saving.then(async () => {
      const one = kept.get(taikoNo);
      if (one === undefined) {
        return;
      }
      // Both as they stand now: a fold landing while the log is written waits for the next save.
      const { book, log } = one;
      if (log !== one.savedLog) {
        await changes.save(taikoNo, log);
        one.savedLog = log;
      }
      await store.save(taikoNo, book);
    });
    saving = saved.catch(() => undefined);
    return saved;
  };
  return {
    of: async (taikoNo: string): Promise<ScoreBook> => (await held(taikoNo)).book,
    // Takes the book only once loaded, so two changes in flight both land.
    async change(taikoNo: string, how: (book: ScoreBook) => ScoreBook): Promise<void> {
      const one = await held(taikoNo);
      one.book = how(one.book);
    },
    /** Folds in a chart's details, and logs how they differ from the reading they replace. */
    async fold(taikoNo: string, score: Score): Promise<void> {
      const one = await held(taikoNo);
      one.log = logDetail(one.log, one.book, score);
      one.book = foldDetail(one.book, score);
    },
    /** Starts the log once a read has taken every chart it needed: changes after it are kept. */
    async baseline(taikoNo: string): Promise<void> {
      const one = await held(taikoNo);
      const log = withBaseline(one.log);
      if (log !== one.log) {
        one.log = log;
        await save(taikoNo);
      }
    },
    save,
  };
}

/** The played charts with details, in song number order: the page sorts them its own way. */
function viewOf(book: ScoreBook, plays: readonly RecentPlay[]): ScoresView {
  const songs = new Map(book.songs.map((song) => [song.songNo, song]));
  const recent = recentOrder(book, plays);
  const scores = Object.entries(book.scores).flatMap(([key, score]): ScoreView[] => {
    const song = songs.get(score.songNo);
    if (score.record === null || song === undefined) {
      return [];
    }
    const { songNo, level, crown, scoreRank, record, fetchedAt } = score;
    return [
      {
        songNo,
        songTitle: song.title,
        genre: song.genres[0] ?? null,
        genres: song.genres,
        level,
        crown,
        scoreRank,
        record,
        ranking: score.ranking ?? null,
        sections: score.sections ?? [],
        recent: recent.get(key) ?? null,
        fetchedAt,
      },
    ];
  });
  scores.sort(
    (left, right) => Number(left.songNo) - Number(right.songNo) || left.level - right.level,
  );
  return { scores, unread: chartsToRead(book).length, songs: book.songs };
}
