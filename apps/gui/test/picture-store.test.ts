/**
 * The run's picture store: what it gives back, and what it drops past its caps; and the names a
 * lasting store files pictures under.
 */
import { describe, expect, test } from "bun:test";

import { createMemoryPictureStore, type PictureKey, pictureKeyPath } from "../src/hiroba-session";

const item = (id: number): PictureKey => ({
  scope: "shared",
  player: null,
  name: `v1/item/1/${id}`,
});
const plate = (player: string): PictureKey => ({
  scope: "player",
  player,
  name: "v1/titleplate/bare/x",
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

describe("pictureKeyPath", () => {
  const HASH = /^[0-9a-f]{64}$/;

  test("files shared art under its hashed name, and a player's own under theirs as well", () => {
    const [scope, name, ...rest] = pictureKeyPath(item(36)).split("/");
    expect([scope, rest]).toEqual(["shared", []]);
    expect(name).toMatch(HASH);
    const [playerScope, player, plateName] = pictureKeyPath(plate("000000000000")).split("/");
    expect(playerScope).toBe("player");
    expect(player).toMatch(HASH);
    expect(plateName).toMatch(HASH);
  });

  test("gives each picture, and each player, a path of its own", () => {
    const paths = [item(36), item(4), plate("000000000000"), plate("000000000001")].map(
      pictureKeyPath,
    );
    expect(new Set(paths).size).toBe(paths.length);
    expect(pictureKeyPath(item(36))).toBe(pictureKeyPath({ ...item(36) }));
  });
});
