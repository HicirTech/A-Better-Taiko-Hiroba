import {
  foldDetail,
  logDetail,
  type Score,
  type ScoreBook,
  type ScoreChangeLog,
  startingLog,
  withBaseline,
} from "@abth/core";

import type { ScoreChangesStore, ScoresStore } from "./kept-things";

/** A player's book and log of changes, as last loaded or changed. */
interface Kept {
  book: ScoreBook;
  log: ScoreChangeLog;
  /** The log as last written: none until a first save writes one. */
  savedLog: ScoreChangeLog | null;
}

/** Each player's book and log, loaded once and changed in place; saves go one after another. */
export function createScoreBooks(store: ScoresStore, changes: ScoreChangesStore) {
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
    logOf: async (taikoNo: string): Promise<ScoreChangeLog> => (await held(taikoNo)).log,
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
