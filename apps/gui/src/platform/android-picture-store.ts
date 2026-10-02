import {
  createMemoryPictureStore,
  PICTURE_EPOCH,
  type PictureStore,
  pictureKeyPath,
} from "../hiroba-session";
import {
  completed,
  type Database,
  type DatabaseFactory,
  openDatabase,
  succeeded,
} from "./android-indexeddb";

const DATABASE = "abth-pictures";
const DATABASE_VERSION = 1;
/** The pictures' PNG bytes, each under its pictureKeyPath. */
const PICTURES = "pictures";
/** One record, under EPOCH_KEY: the PICTURE_EPOCH the pictures were kept under. */
const META = "meta";
const EPOCH_KEY = "epoch";

/**
 * Android's pictures in the app page's IndexedDB, kept across launches and sign-outs for good:
 * each is fetched from Hiroba once (the user's call, 2026-09-28). Each record is the checked PNG
 * bytes and nothing else, no URL, header, cookie or taiko number, under pictureKeyPath's hashes.
 *
 * Nothing here deletes a picture but a PICTURE_EPOCH bump: opening the database under a new epoch
 * clears it. What it holds is bounded by what Hiroba has to show, a thumbnail per item and a plate
 * per title, each within its kind's byte limit. The system may still drop the whole database when
 * storage runs short, which costs only fetches.
 *
 * The database is opened in the background, and a store that cannot open it, blocked or refused,
 * keeps this run's pictures in memory instead. A record that cannot be read is a miss, and a
 * picture that cannot be written, past the quota say, is not kept: either way it is fetched again,
 * and nothing throws.
 */
export function createIndexedDbPictureStore(factory: DatabaseFactory): PictureStore {
  const opened: Promise<PictureStore> = openPictureDatabase(factory).then(databaseStore, () =>
    createMemoryPictureStore(),
  );
  return {
    get: async (key) => (await opened).get(key),
    put: async (key, bytes) => (await opened).put(key, bytes),
  };
}

function databaseStore(database: Database): PictureStore {
  return {
    async get(key) {
      try {
        const table = database.transaction(PICTURES, "readonly").objectStore(PICTURES);
        const value = await succeeded(table.get(pictureKeyPath(key)));
        return value instanceof Uint8Array ? value : null;
      } catch {
        return null;
      }
    },
    async put(key, bytes) {
      try {
        const transaction = database.transaction(PICTURES, "readwrite");
        // A copy of the bytes alone: a view would take its whole buffer along.
        transaction.objectStore(PICTURES).put(bytes.slice(), pictureKeyPath(key));
        await completed(transaction);
      } catch {
        // Not kept: the next launch fetches it again.
      }
    },
  };
}

async function openPictureDatabase(factory: DatabaseFactory): Promise<Database> {
  const database = await openDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(PICTURES);
    created.createObjectStore(META);
  });
  await dropOtherEpochs(database);
  return database;
}

/** Clears what an earlier PICTURE_EPOCH kept: none of it is asked for again. */
function dropOtherEpochs(database: Database): Promise<void> {
  const transaction = database.transaction([PICTURES, META], "readwrite");
  const meta = transaction.objectStore(META);
  const epoch = meta.get(EPOCH_KEY);
  epoch.onsuccess = () => {
    if (epoch.result !== PICTURE_EPOCH) {
      transaction.objectStore(PICTURES).clear();
      meta.put(PICTURE_EPOCH, EPOCH_KEY);
    }
  };
  return completed(transaction);
}
