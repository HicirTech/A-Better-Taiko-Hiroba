import { forgetSetting, keepSetting, keptSetting, pageStorage } from "../kept-settings";
import type { PickableSongs, ReadFailure } from "../session-port";

const KEY = "abth.pickableSongs";
const VERSION = 1;
const SONG_NO = /^\d{1,5}$/;

/** The songs the pickers list, by number, and those with a 裏 entry. */
export interface OfferedSongs {
  readonly songs: ReadonlySet<string>;
  readonly ura: ReadonlySet<string>;
}

export type PickableStatus =
  | { readonly kind: "current" | "reading" | "stale" }
  | { readonly kind: "failed"; readonly failure: ReadFailure };

/** What Hiroba's own 大好きな曲 picker offers, as the pickers list it: no more than that. */
export interface PickableState {
  /** The latest read, or the list kept on the device; null before either. */
  readonly offered: OfferedSongs | null;
  readonly status: PickableStatus;
}

export function offeredOf(read: PickableSongs): OfferedSongs {
  return { songs: new Set(read.songs), ura: new Set(read.ura) };
}

const isSongNos = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((one) => typeof one === "string" && SONG_NO.test(one));

/** The list kept on the device, from the last read; one of another shape is none. */
export function loadPickable(storage: Storage | undefined = pageStorage()): OfferedSongs | null {
  const text = keptSetting(KEY, (value): value is string => typeof value === "string", storage);
  if (text === null) {
    return null;
  }
  try {
    const kept: unknown = JSON.parse(text);
    if (
      typeof kept === "object" &&
      kept !== null &&
      "v" in kept &&
      kept.v === VERSION &&
      "songs" in kept &&
      isSongNos(kept.songs) &&
      "ura" in kept &&
      isSongNos(kept.ura)
    ) {
      return offeredOf({ songs: kept.songs, ura: kept.ura });
    }
    return null;
  } catch {
    return null;
  }
}

export function keepPickable(read: PickableSongs, storage: Storage | undefined = pageStorage()) {
  keepSetting(KEY, JSON.stringify({ v: VERSION, songs: read.songs, ura: read.ura }), storage);
}

/** Another player may sign in next, and the list is one player's. */
export function forgetPickable(storage: Storage | undefined = pageStorage()) {
  forgetSetting(KEY, storage);
}
