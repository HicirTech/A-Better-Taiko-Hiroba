import { sha256Hex } from "./sha256";

/**
 * Part of every picture's key: bumping it drops every picture kept under the old one, wherever it
 * is kept.
 */
export const PICTURE_EPOCH = "v1";

/**
 * Where a picture is kept. None expires: each is keyed by what it shows, so a store keeps it as long
 * as it can, and only a PICTURE_EPOCH bump or the store's caps make it go. Arcades often have poor
 * networks, so the app asks Hiroba for a picture as seldom as it can (the user's call, 2026-09-28).
 *
 * - `shared`: art that carries nothing about the player, such as an item's thumbnail, whose URL names
 *   no player. Kept for any account on this device, and kept at sign-out.
 * - `player`: the signed-in player's own, such as their title plate. Kept under `player`, so no
 *   other account is given it, and kept at sign-out and at the next sign-in: once a player has a
 *   picture, it stays (the user's call, 2026-09-28).
 */
export interface PictureKey {
  readonly scope: "shared" | "player";
  /** Whose picture, for the `player` scope: the taiko number. Null for a shared one. */
  readonly player: string | null;
  /** The picture's name within its scope, the epoch first: `v1/item/1/36`. */
  readonly name: string;
}

/**
 * Where a store that outlasts the run files `key`: `shared/<name>`, or `player/<player>/<name>`
 * for a player's own, each part the SHA-256 of what it stands for, so neither a taiko number nor a
 * title is ever written out in clear.
 */
export function pictureKeyPath(key: PictureKey): string {
  const name = sha256Hex(key.name);
  return key.scope === "shared"
    ? `shared/${name}`
    : `player/${sha256Hex(key.player ?? "")}/${name}`;
}

/**
 * Where the platform keeps the pictures it fetched from Hiroba: the checked PNG bytes and nothing
 * else, no URL, header or cookie. A store is a cache and nothing more: an entry it cannot give back
 * is a miss, and one it cannot keep costs only a fetch the next time.
 */
export interface PictureStore {
  /** The bytes kept under `key`, or null when none are. */
  get(key: PictureKey): Promise<Uint8Array | null>;
  /** Keeps `bytes` under `key`. Never throws: a picture that cannot be kept is simply not kept. */
  put(key: PictureKey, bytes: Uint8Array): Promise<void>;
}

/** The most a store keeps before the least recently used entries go. */
export interface PictureStoreCaps {
  /** Shared art, all of it together. */
  readonly sharedBytes: number;
  readonly sharedEntries: number;
  /** Each player's own pictures. */
  readonly playerBytes: number;
}

/**
 * Well above what a whole wardrobe's thumbnails and the panel's art come to (under half a megabyte),
 * and still a bound.
 */
export const PICTURE_STORE_CAPS: PictureStoreCaps = {
  sharedBytes: 8 * 1024 * 1024,
  sharedEntries: 2000,
  playerBytes: 2 * 1024 * 1024,
};

export interface MemoryPictureStoreOptions {
  readonly caps?: PictureStoreCaps;
}

interface Entry {
  readonly scope: PictureKey["scope"];
  readonly player: string | null;
  readonly bytes: Uint8Array;
}

/**
 * A store in memory, for this run of the app only: each picture is fetched once per run at most.
 * Every entry is a copy, so no caller can change what another is given.
 */
export function createMemoryPictureStore(options: MemoryPictureStoreOptions = {}): PictureStore {
  const caps = options.caps ?? PICTURE_STORE_CAPS;
  /** In order of use, the least recently used first. */
  const entries = new Map<string, Entry>();

  const idOf = (key: PictureKey) =>
    `${key.scope}|${key.scope === "player" ? (key.player ?? "") : ""}|${key.name}`;

  /** Drops the least recently used entries of `entry`'s scope, and player, until both caps hold. */
  const trim = (scope: PictureKey["scope"], player: string | null) => {
    const same = [...entries].filter(
      ([, entry]) => entry.scope === scope && (scope === "shared" || entry.player === player),
    );
    let bytes = same.reduce((sum, [, entry]) => sum + entry.bytes.byteLength, 0);
    let count = same.length;
    const maxBytes = scope === "shared" ? caps.sharedBytes : caps.playerBytes;
    const maxEntries = scope === "shared" ? caps.sharedEntries : Number.POSITIVE_INFINITY;
    for (const [id, entry] of same) {
      if (bytes <= maxBytes && count <= maxEntries) {
        break;
      }
      entries.delete(id);
      bytes -= entry.bytes.byteLength;
      count -= 1;
    }
  };

  return {
    async get(key) {
      const id = idOf(key);
      const entry = entries.get(id);
      if (entry === undefined) {
        return null;
      }
      // Used now: the last to go.
      entries.delete(id);
      entries.set(id, entry);
      return entry.bytes.slice();
    },
    async put(key, bytes) {
      const id = idOf(key);
      const player = key.scope === "player" ? key.player : null;
      entries.delete(id);
      entries.set(id, { scope: key.scope, player, bytes: bytes.slice() });
      trim(key.scope, player);
    },
  };
}
