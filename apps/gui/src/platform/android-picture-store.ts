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

/** Android's pictures, in the page's IndexedDB across launches and sign-outs; a PICTURE_EPOCH bump
 * clears them. If it cannot open, this run's pictures stay in memory; nothing throws. */
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
