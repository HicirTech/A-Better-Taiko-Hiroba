import {
  createMemoryPictureStore,
  KEPT_COSTUME_HISTORY,
  KEPT_FOLDER_HISTORY,
  type KeptStore,
  type KeptThing,
  keptMemoryStore,
  type ServiceStores,
} from "../hiroba-session";
import { createMemoryPipelineStore } from "../shared/pipelines";
import type { DatabaseFactory } from "./capacitor-indexeddb";
import {
  CHART_DENSITY_DATABASE,
  CHART_PICTURE_DATABASE,
  createIndexedDbPictureStore,
  DRAWN_CHART_DATABASE,
} from "./capacitor-picture-store";
import { createIndexedDbPipelineStores } from "./capacitor-pipeline-store";
import { keptIndexedDbStore } from "./kept-indexeddb-store";

/** Refuses every call, so a history is simply empty. */
const nowhere = <T, M>(): KeptStore<T, M> => ({
  load: () => Promise.reject(new Error("There is nowhere to keep a history")),
  save: () => Promise.reject(new Error("There is nowhere to keep a history")),
});
const HISTORIES: ReadonlySet<object> = new Set([KEPT_COSTUME_HISTORY, KEPT_FOLDER_HISTORY]);

/** Kept in IndexedDB; without it in memory, but for the histories, which are kept nowhere. */
function keptOnDevice<T, M>(
  indexedDb: DatabaseFactory | undefined,
  thing: KeptThing<T, M>,
): KeptStore<T, M> {
  if (indexedDb !== undefined) {
    return keptIndexedDbStore(indexedDb, thing);
  }
  return HISTORIES.has(thing) ? nowhere() : keptMemoryStore(thing);
}

/** Where the services keep things on the device: in IndexedDB, or in memory without it. */
export function capacitorStores(indexedDb: DatabaseFactory | undefined): ServiceStores {
  const pictureStore = (database?: string) =>
    indexedDb === undefined
      ? createMemoryPictureStore()
      : createIndexedDbPictureStore(indexedDb, database);
  return {
    pipeline:
      indexedDb === undefined
        ? () => createMemoryPipelineStore()
        : createIndexedDbPipelineStores(indexedDb),
    kept: (thing) => keptOnDevice(indexedDb, thing),
    pictures: pictureStore(),
    charts: pictureStore(CHART_PICTURE_DATABASE),
    densities: pictureStore(CHART_DENSITY_DATABASE),
    drawnCharts: pictureStore(DRAWN_CHART_DATABASE),
  };
}
