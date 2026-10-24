import {
  err,
  type HirobaReadFailure,
  isErr,
  parseRecentPlaysPage,
  type RecentPlay,
  type RecentPlaysReading,
  type Result,
  readHirobaPage,
  readRecentPlays as walkRecentPlays,
} from "@abth/core";

import {
  type GroupAsked,
  HISTORY_READ_CONSUMERS,
  type Pipeline,
  resultFailure,
} from "../shared/pipelines";
import type { RecentPlaysFailure } from "../shared/session-port";
import type { RecentPlaysStore } from "./recent-plays-store";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints } from "./types";

/** Page 1 is the bare path; later pages are the feed's own `?page=N`. */
export function recentPlaysPath(page: number): string {
  return page === 1 ? "history_recent_score.php" : `history_recent_score.php?page=${page}`;
}

/** The operation each page of a walk runs as; its subject is the page. */
export const RECENT_PLAYS_PAGE_OPERATION = "recentPlaysPage";

const PAGE_GROUP: GroupAsked<Result<readonly RecentPlay[], HirobaReadFailure>> = {
  operation: RECENT_PLAYS_PAGE_OPERATION,
  failureOf: resultFailure,
};

export interface RecentPlaysReader {
  /** The stored walk, newest first. Asks Hiroba nothing. */
  recentPlays(): Promise<readonly RecentPlay[]>;
  /** Walks the feed, then stores what it read. A second call shares the walk already running. */
  readRecentPlays(): Promise<Result<RecentPlaysReading, RecentPlaysFailure>>;
  /** As `readRecentPlays`, but walks every page past the rows stored, which its walk replaces. */
  readEveryRecentPlay(): Promise<Result<RecentPlaysReading, RecentPlaysFailure>>;
  /** The newest page whose request has started, or null when no walk is running. */
  recentPlaysProgress(): Promise<number | null>;
}

export interface RecentPlaysReaderOptions {
  readonly endpoints: HirobaEndpoints;
  /** The play history pipeline: each page is a read group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  readonly store: RecentPlaysStore;
  readonly owner: () => string | null;
  readonly endSession: () => void | Promise<void>;
  /** Told of each walk once it is stored, before the walk answers: what it found was played. */
  readonly walked?: (taikoNo: string, reading: RecentPlaysReading) => Promise<void>;
}

/** The port's three verbs, the same on every shell. */
export function createRecentPlaysReader(options: RecentPlaysReaderOptions): RecentPlaysReader {
  const { pipeline, store, owner } = options;
  const fetchPage = (page: number) =>
    pipeline.read({ ...PAGE_GROUP, subject: String(page) }, (transport) =>
      readHirobaPage(
        { transport, hirobaOrigin: options.endpoints.hirobaOrigin },
        recentPlaysPath(page),
        parseRecentPlaysPage,
      ),
    );
  let walking: Promise<Result<RecentPlaysReading, RecentPlaysFailure>> | null = null;
  let progress: number | null = null;
  const walk = async (
    everyPage: boolean,
  ): Promise<Result<RecentPlaysReading, RecentPlaysFailure>> => {
    const taikoNo = owner();
    if (taikoNo === null) {
      return err({ kind: "notSignedIn" });
    }
    const read = await walkRecentPlays({
      fetchPage,
      previous: await store.load(taikoNo),
      everyPage,
      atOnce: HISTORY_READ_CONSUMERS,
      onPage: (page) => {
        progress = page;
      },
    });
    if (isErr(read)) {
      const { page, failure } = read.error;
      if (sessionEnded(failure)) {
        await options.endSession();
      }
      return err({ ...failure, page });
    }
    await store.save(taikoNo, read.value.plays);
    await options.walked?.(taikoNo, read.value);
    return read;
  };
  // A second call, of either kind, shares the walk already running.
  const shared = (everyPage: boolean) => {
    walking ??= walk(everyPage).finally(() => {
      progress = null;
      walking = null;
    });
    return walking;
  };
  return {
    async recentPlays() {
      const taikoNo = owner();
      return taikoNo === null ? [] : store.load(taikoNo);
    },
    readRecentPlays: () => shared(false),
    readEveryRecentPlay: () => shared(true),
    recentPlaysProgress: () => Promise.resolve(progress),
  };
}
