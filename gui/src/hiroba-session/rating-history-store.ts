import {
  type ChartRating,
  type PlayerFigure,
  type RatingSnapshot,
  type RatingSystem,
  withSnapshot,
} from "@abth/core";
import type { HirobaSessionPort } from "../shared/session-port";
import { isLevel, isObject } from "./recent-plays-store";
import { isSongNo } from "./scores-store";

/** One player's kept ratings, oldest first, for each rating system. */
export type RatingHistory = Readonly<Record<RatingSystem, readonly RatingSnapshot[]>>;

export const NO_RATING_HISTORY: RatingHistory = { ourtaikoV1: [], ourtaikoV2: [] };

/** One player's kept ratings. A missing store reads as none. */
export interface RatingHistoryStore {
  load(taikoNo: string): Promise<RatingHistory>;
  save(taikoNo: string, history: RatingHistory): Promise<void>;
}

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function figureOf(value: unknown): PlayerFigure[] {
  return isObject(value) && typeof value.figure === "string" && isNumber(value.value)
    ? [
        {
          figure: value.figure as PlayerFigure["figure"],
          value: value.value,
          compensated: value.compensated === true,
        },
      ]
    : [];
}

function chartOf(value: unknown): ChartRating[] {
  if (
    !isObject(value) ||
    !isSongNo(value.songNo) ||
    !isLevel(value.level) ||
    !isNumber(value.accuracy) ||
    !isNumber(value.constant) ||
    !isObject(value.figures) ||
    !isNumber(value.figures.rating) ||
    !Object.values(value.figures).every(isNumber)
  ) {
    return [];
  }
  return [
    {
      songNo: value.songNo,
      level: value.level,
      accuracy: value.accuracy,
      constant: value.constant,
      figures: value.figures as ChartRating["figures"],
    },
  ];
}

function snapshotsOf(value: unknown): RatingSnapshot[] {
  return (Array.isArray(value) ? value : []).flatMap((snapshot): RatingSnapshot[] =>
    isObject(snapshot) &&
    typeof snapshot.at === "string" &&
    Array.isArray(snapshot.figures) &&
    Array.isArray(snapshot.charts)
      ? [
          {
            at: snapshot.at,
            figures: snapshot.figures.flatMap(figureOf),
            charts: snapshot.charts.flatMap(chartOf),
          },
        ]
      : [],
  );
}

/** A kept history's well-formed snapshots; what does not read as a history at all is none. */
export function readStoredRatingHistory(stored: unknown): RatingHistory | null {
  return isObject(stored)
    ? { ourtaikoV1: snapshotsOf(stored.ourtaikoV1), ourtaikoV2: snapshotsOf(stored.ourtaikoV2) }
    : null;
}

export function createMemoryRatingHistoryStore(): RatingHistoryStore {
  const players = new Map<string, RatingHistory>();
  return {
    async load(taikoNo) {
      return players.get(taikoNo) ?? NO_RATING_HISTORY;
    },
    async save(taikoNo, history) {
      players.set(taikoNo, history);
    },
  };
}

/** The port's two verbs on the kept ratings, the same on every shell. Asks no site anything. */
export function createRatingHistory({
  store,
  owner,
}: {
  readonly store: RatingHistoryStore;
  readonly owner: () => string | null;
}): Pick<HirobaSessionPort, "ratingHistory" | "keepRating"> {
  // One after another: both systems' ratings are kept as one read ends, in the one record.
  let last: Promise<unknown> = Promise.resolve();
  const inTurn = <T>(work: () => Promise<T>): Promise<T> => {
    const done = last.then(work);
    last = done.catch(() => undefined);
    return done;
  };
  return {
    async ratingHistory(system) {
      const taikoNo = owner();
      return taikoNo === null ? [] : (await store.load(taikoNo))[system];
    },
    keepRating: (system, snapshot) =>
      inTurn(async () => {
        const taikoNo = owner();
        if (taikoNo === null) {
          return [];
        }
        const history = await store.load(taikoNo);
        const kept = withSnapshot(history[system], snapshot);
        if (kept !== history[system]) {
          await store.save(taikoNo, { ...history, [system]: kept });
        }
        return kept;
      }),
  };
}
