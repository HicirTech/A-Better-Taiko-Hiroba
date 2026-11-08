import { withSnapshot } from "@abth/core";
import type { HirobaSessionPort } from "../shared/session-port";
import type { RatingHistoryStore } from "./kept-things";

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
