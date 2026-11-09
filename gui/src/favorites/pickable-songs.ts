import { isSongNo } from "@abth/core";
import { forgetSetting, keepJson, keptJson, pageStorage } from "../shared/kept-settings";
import type { PickableSongs, ReadFailure } from "../shared/session-port";

const KEY = "abth.pickableSongs";
const VERSION = 1;

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

/** Every song taiko.wiki lists, as a gift's picker offers them: the receiver's Hiroba decides. */
export function everySong(songNos: Iterable<string>): PickableState {
  return { offered: { songs: new Set(songNos), ura: new Set() }, status: { kind: "current" } };
}

export function offeredOf(read: PickableSongs): OfferedSongs {
  return { songs: new Set(read.songs), ura: new Set(read.ura) };
}

const isSongNos = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isSongNo);

const offeredIn = ({ songs, ura }: Record<string, unknown>): OfferedSongs | null =>
  isSongNos(songs) && isSongNos(ura) ? offeredOf({ songs, ura }) : null;

/** The list kept on the device, from the last read; one of another shape is none. */
export function loadPickable(storage: Storage | undefined = pageStorage()): OfferedSongs | null {
  return keptJson(KEY, VERSION, offeredIn, storage);
}

export function keepPickable(read: PickableSongs, storage: Storage | undefined = pageStorage()) {
  keepJson(KEY, VERSION, { songs: read.songs, ura: read.ura }, storage);
}

/** Another player may sign in next, and the list is one player's. */
export function forgetPickable(storage: Storage | undefined = pageStorage()) {
  forgetSetting(KEY, storage);
}
