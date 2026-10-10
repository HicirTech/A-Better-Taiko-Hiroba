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
  noteWalk as noteWalkInBook,
  ok,
  parseScoreDetailPage,
  parseScoreListPage,
  type RecentPlay,
  type RecentPlaysReading,
  type Result,
  readHirobaPage,
  recentOrder,
  type ScoreBook,
  songCharts,
} from "@abth/core";

import { type Pipeline, resultFailure, SCORE_READ_CONSUMERS } from "../pipelines";
import type {
  RecentPlaysFailure,
  ScoresFailure,
  ScoresProgress,
  ScoresRead,
  ScoresView,
  ScoreView,
} from "../session-port";
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
  /** The walk, the lists the book needs, then the details left; a second call shares it. */
  readScores(): Promise<Result<ScoresRead, ScoresFailure>>;
  /** As `readScores`, but every list, then every played chart, as the first read takes them. */
  readEveryScore(): Promise<Result<ScoresRead, ScoresFailure>>;
  readSongScores(songNo: string): Promise<Result<ScoresRead, ScoresFailure>>;
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
  readonly owner: () => string | null;
  readonly endSession: () => void | Promise<void>;
  /** Walks recent plays as their page does; the walk notes what it found here itself. */
  readonly walk: () => Promise<Result<RecentPlaysReading, RecentPlaysFailure>>;
  readonly walkProgress: () => Promise<number | null>;
  /** The recent plays kept on the device, newest first: the order the page can sort by. */
  readonly recentPlays: () => Promise<readonly RecentPlay[]>;
  readonly now?: () => Date;
}

/** The port's five verbs, the same on every shell. */
export function createScoresReader(options: ScoresReaderOptions): ScoresReader {
  const { endpoints, owner } = options;
  const now = options.now ?? (() => new Date());
  const books = createBooks(options.store);
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
    const fetchedAt = now().toISOString();
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
          (html) => parseScoreDetailPage(html, taikoNo, songNo, level, now().toISOString()),
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
        await books.change(taikoNo, (book) => foldDetail(book, answer.value));
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
    return detailed === null ? readOf(taikoNo, charts) : failed(detailed);
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
    async readSongScores(songNo) {
      const taikoNo = owner();
      if (taikoNo === null) {
        return err({ kind: "notSignedIn" });
      }
      const charts = songCharts(await books.of(taikoNo), songNo);
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

/** Each player's book, loaded once and changed in place; saves go one after another. */
function createBooks(store: ScoresStore) {
  const kept = new Map<string, ScoreBook>();
  const loads = new Map<string, Promise<void>>();
  let saving: Promise<void> = Promise.resolve();

  const loaded = (taikoNo: string): Promise<void> => {
    let load = loads.get(taikoNo);
    if (load === undefined) {
      load = store.load(taikoNo).then(
        (book) => {
          kept.set(taikoNo, book);
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
  const of = async (taikoNo: string): Promise<ScoreBook> => {
    await loaded(taikoNo);
    return kept.get(taikoNo) ?? EMPTY_SCORE_BOOK;
  };
  return {
    of,
    // Takes the book only once loaded, so two changes in flight both land.
    async change(taikoNo: string, how: (book: ScoreBook) => ScoreBook): Promise<void> {
      await loaded(taikoNo);
      kept.set(taikoNo, how(kept.get(taikoNo) ?? EMPTY_SCORE_BOOK));
    },
    save(taikoNo: string): Promise<void> {
      const saved = saving.then(() => store.save(taikoNo, kept.get(taikoNo) ?? EMPTY_SCORE_BOOK));
      saving = saved.catch(() => undefined);
      return saved;
    },
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
  return { scores, unread: chartsToRead(book).length };
}
