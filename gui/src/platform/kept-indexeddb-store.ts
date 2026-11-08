import type { KeptStore, KeptThing } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./capacitor-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE_VERSION = 1;

/** A kind of kept data on Android: a database of its own, one record for each taiko number. */
export function keptIndexedDbStore<T, M>(
  factory: DatabaseFactory,
  thing: KeptThing<T, M>,
): KeptStore<T, M> {
  const recordsIn = (name: string) =>
    keptRecords(
      lazyDatabase(factory, name, DATABASE_VERSION, (created) => {
        created.createObjectStore(thing.table);
      }),
      thing.table,
      thing.field,
      (data) => thing.read(data) !== null,
    );
  const kept = recordsIn(thing.database);
  const earlier = thing.earlier === undefined ? null : recordsIn(thing.earlier.database);
  return {
    async load(taikoNo) {
      const stored = (await kept.load(taikoNo)) ?? (await earlier?.load(taikoNo));
      return thing.read(stored) ?? thing.missing;
    },
    async save(taikoNo, value) {
      await kept.save(taikoNo, thing.dropped(value) ? undefined : value);
    },
  };
}
