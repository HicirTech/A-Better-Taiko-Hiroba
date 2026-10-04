import { sha256Hex } from "./sha256";

/** Part of every picture's key: bumping it drops every picture kept under the old one. */
export const PICTURE_EPOCH = "v1";

/** Where a picture is kept. None expires or goes at sign-out: each is keyed by what it shows, and
 * arcades often have poor networks. A durable store drops one only on a PICTURE_EPOCH bump. */
export interface PictureKey {
  /** `shared` art names no player and serves any account; `player` is the signed-in player's. */
  readonly scope: "shared" | "player";
  /** Whose picture, for the `player` scope: the taiko number. Null for a shared one. */
  readonly player: string | null;
  /** The picture's name within its scope, the epoch first: `v1/item/1/36`. */
  readonly name: string;
}

/** Where a durable store files `key`: `shared/<name>` or `player/<player>/<name>`, each part a
 * hash, so neither a taiko number nor a title is written out in clear. */
export function pictureKeyPath(key: PictureKey): string {
  const name = sha256Hex(key.name);
  return key.scope === "shared"
    ? `shared/${name}`
    : `player/${sha256Hex(key.player ?? "")}/${name}`;
}

/** Where the checked PNG bytes of fetched pictures are kept, and nothing else: no URL, header or
 * cookie. A cache only: an entry it cannot give back is a miss. */
export interface PictureStore {
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

/** Well above what a whole wardrobe's thumbnails and the panel's art come to, and still a bound. */
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

/** A store in memory for this run only. Every entry is a copy, so no caller can change what
 * another is given. */
export function createMemoryPictureStore(options: MemoryPictureStoreOptions = {}): PictureStore {
  const caps = options.caps ?? PICTURE_STORE_CAPS;
  /** In order of use, the least recently used first. */
  const entries = new Map<string, Entry>();

  const idOf = (key: PictureKey) =>
    `${key.scope}|${key.scope === "player" ? (key.player ?? "") : ""}|${key.name}`;

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
