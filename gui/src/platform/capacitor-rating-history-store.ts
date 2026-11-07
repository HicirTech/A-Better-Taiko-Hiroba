import {
  NO_RATING_HISTORY,
  type RatingHistoryStore,
  readStoredRatingHistory,
} from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./capacitor-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-rating-history";
const DATABASE_VERSION = 1;
/** The ratings, one record for each player, under the taiko number. */
const RATINGS = "ratings";

/** Android's kept ratings, in a database of their own. */
export function createIndexedDbRatingHistoryStore(factory: DatabaseFactory): RatingHistoryStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(RATINGS);
  });
  const kept = keptRecords(
    database,
    RATINGS,
    "history",
    (history) => readStoredRatingHistory(history) !== null,
  );
  return {
    async load(taikoNo) {
      return readStoredRatingHistory(await kept.load(taikoNo)) ?? NO_RATING_HISTORY;
    },
    async save(taikoNo, history) {
      await kept.save(taikoNo, history);
    },
  };
}
