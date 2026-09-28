/** The run's picture store: what it gives back, for how long, and what it forgets. */
import { describe, expect, test } from "bun:test";

import { createMemoryPictureStore, type PictureKey } from "../src/hiroba-session";

const DAY = 24 * 60 * 60 * 1000;
const item = (id: number): PictureKey => ({
  scope: "shared",
  player: null,
  name: `v1/item/1/${id}`,
  maxAgeMs: 30 * DAY,
});
const plate = (player: string): PictureKey => ({
  scope: "player",
  player,
  name: "v1/titleplate/bare/x",
  maxAgeMs: 7 * DAY,
});
const bytes = (size: number, fill = 1) => new Uint8Array(size).fill(fill);

describe("createMemoryPictureStore", () => {
  test("gives back a copy of what it was given, and nothing for a key it was not", async () => {
    const store = createMemoryPictureStore();
    const kept = bytes(4, 7);
    await store.put(item(36), kept);
    kept.fill(0);
    const first = await store.get(item(36));
    expect(first).toEqual(bytes(4, 7));
    first?.fill(0);
    expect(await store.get(item(36))).toEqual(bytes(4, 7));
    expect(await store.get(item(4))).toBeNull();
  });

  test("keeps one player's pictures apart from another's, and apart from shared art", async () => {
    const store = createMemoryPictureStore();
    await store.put(plate("A"), bytes(2, 1));
    await store.put(plate("B"), bytes(2, 2));
    await store.put({ ...plate("A"), scope: "shared", player: null }, bytes(2, 3));
    expect(await store.get(plate("A"))).toEqual(bytes(2, 1));
    expect(await store.get(plate("B"))).toEqual(bytes(2, 2));
    expect(await store.get({ ...plate("A"), scope: "shared", player: null })).toEqual(bytes(2, 3));
  });

  test("serves an entry no longer than its key's maximum age", async () => {
    let now = 0;
    const store = createMemoryPictureStore({ now: () => now });
    await store.put(item(36), bytes(4));
    now = 30 * DAY;
    expect(await store.get(item(36))).toEqual(bytes(4));
    now = 30 * DAY + 1;
    expect(await store.get(item(36))).toBeNull();
    now = 0;
    expect(await store.get(item(36))).toBeNull();
  });

  test("forgets every player's pictures, and keeps shared art", async () => {
    const store = createMemoryPictureStore();
    await store.put(item(36), bytes(4));
    await store.put(plate("A"), bytes(4));
    await store.put(plate("B"), bytes(4));
    await store.forgetPlayers();
    expect(await store.get(plate("A"))).toBeNull();
    expect(await store.get(plate("B"))).toBeNull();
    expect(await store.get(item(36))).toEqual(bytes(4));
  });

  test("drops the least recently used past its caps, each player's apart", async () => {
    const store = createMemoryPictureStore({
      caps: { sharedBytes: 10, sharedEntries: 3, playerBytes: 6 },
    });
    await store.put(item(1), bytes(2));
    await store.put(item(2), bytes(2));
    await store.put(item(3), bytes(2));
    // Used, so 2 is now the least recently used.
    await store.get(item(1));
    await store.put(item(4), bytes(2));
    expect(await store.get(item(2))).toBeNull();
    expect(await store.get(item(1))).not.toBeNull();
    expect(await store.get(item(3))).not.toBeNull();
    expect(await store.get(item(4))).not.toBeNull();
    // Past the bytes as well, at 2 + 2 + 2 + 6: the least recently used, 1, goes.
    await store.put(item(5), bytes(6));
    expect(await store.get(item(1))).toBeNull();
    expect(await store.get(item(5))).not.toBeNull();

    await store.put(plate("A"), bytes(4));
    await store.put({ ...plate("A"), name: "v1/other" }, bytes(4));
    await store.put(plate("B"), bytes(6));
    expect(await store.get(plate("A"))).toBeNull();
    expect(await store.get({ ...plate("A"), name: "v1/other" })).not.toBeNull();
    expect(await store.get(plate("B"))).not.toBeNull();
  });
});
