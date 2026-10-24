import * as nodeFs from "node:fs";
import { basename, dirname, join } from "node:path";

import { isObject } from "../src/hiroba-session/recent-plays-store";
import { replaceFile, type StoreFiles } from "./replace-file";

/** The shape the file is kept in, which a later shape would change. */
const VERSION = 1;

type Kept =
  | { readonly kind: "none" }
  | { readonly kind: "players"; readonly players: Record<string, unknown>; readonly text: string }
  | { readonly kind: "later" }
  | { readonly kind: "unreadable"; readonly text: string }
  | { readonly kind: "unopened"; readonly error: unknown };

export interface PlayersFile {
  /** The player's data as this version keeps it, or undefined when none reads. */
  load(taikoNo: string): unknown;
  /** Keeps the player's data, or drops it for undefined; a later version's file stays as it is. */
  save(taikoNo: string, data: unknown): void;
}

/** Each player's data in one file, where a save keeps aside what does not read before it writes. */
export function createPlayersFile(
  path: string,
  readable: (data: unknown) => boolean,
  files: StoreFiles = nodeFs,
): PlayersFile {
  const aside = join(dirname(path), `${basename(path, ".json")}.unreadable.json`);
  const kept = (): Kept => {
    let text: string;
    try {
      text = files.readFileSync(path, "utf8");
    } catch (error) {
      return (error as { code?: unknown }).code === "ENOENT"
        ? { kind: "none" }
        : { kind: "unopened", error };
    }
    try {
      const stored = JSON.parse(text) as { version?: unknown; players?: unknown };
      if (typeof stored.version === "number" && stored.version > VERSION) {
        return { kind: "later" };
      }
      if (
        stored.version === VERSION &&
        isObject(stored.players) &&
        !Array.isArray(stored.players)
      ) {
        return { kind: "players", players: stored.players, text };
      }
    } catch {
      // Cut off, or not JSON at all: kept aside as it is.
    }
    return { kind: "unreadable", text };
  };
  return {
    load(taikoNo) {
      const now = kept();
      if (now.kind !== "players" || !Object.hasOwn(now.players, taikoNo)) {
        return undefined;
      }
      const data = now.players[taikoNo];
      return readable(data) ? data : undefined;
    },
    save(taikoNo, data) {
      const now = kept();
      if (now.kind === "later") {
        return;
      }
      if (now.kind === "unopened") {
        // A file there that this run cannot read is never written over.
        throw now.error;
      }
      if (
        now.kind === "unreadable" ||
        (now.kind === "players" &&
          Object.hasOwn(now.players, taikoNo) &&
          !readable(now.players[taikoNo]))
      ) {
        replaceFile(aside, now.text, files);
      }
      const players = now.kind === "players" ? { ...now.players } : {};
      if (data === undefined) {
        delete players[taikoNo];
      } else {
        players[taikoNo] = data;
      }
      replaceFile(path, JSON.stringify({ version: VERSION, players }), files);
    },
  };
}
