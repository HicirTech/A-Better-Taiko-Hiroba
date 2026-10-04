import { FOLDER_SLOT_COUNT, type FolderState } from "@abth/core";

import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

const KEY = "abth.favoriteSets";
const SONG_NO = /^\d{1,5}$/;

export const SET_NAME_MAX_LENGTH = 40;
/** A set holds as many songs as the folder has slots. */
export const SET_SONG_LIMIT = FOLDER_SLOT_COUNT;

/** Songs the player keeps on this device to put in the folder, in the order of its slots. */
export interface FavoriteSet {
  readonly id: string;
  readonly name: string;
  readonly songs: readonly string[];
}

const cleanName = (name: string): string => name.trim().slice(0, SET_NAME_MAX_LENGTH);

/** The valid song numbers, each once, in order, as many as a set holds. */
function cleanSongs(songs: readonly unknown[]): string[] {
  const valid = songs.filter(
    (song): song is string => typeof song === "string" && SONG_NO.test(song),
  );
  return [...new Set(valid)].slice(0, SET_SONG_LIMIT);
}

function cleanSet(value: unknown): FavoriteSet | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { id, name, songs } = value as Record<string, unknown>;
  if (typeof id !== "string" || id === "" || typeof name !== "string" || !Array.isArray(songs)) {
    return null;
  }

  return { id, name: cleanName(name), songs: cleanSongs(songs) };
}

export function loadSets(storage: Storage | undefined = pageStorage()): readonly FavoriteSet[] {
  const text = keptSetting(KEY, (value): value is string => typeof value === "string", storage);
  if (text === null) {
    return [];
  }

  try {
    const kept: unknown = JSON.parse(text);
    if (typeof kept !== "object" || kept === null) {
      return [];
    }

    const { v, sets } = kept as Record<string, unknown>;
    if (v !== 1 || !Array.isArray(sets)) {
      return [];
    }

    const ids = new Set<string>();
    return sets.flatMap((one) => {
      const set = cleanSet(one);
      if (set === null || ids.has(set.id)) {
        return [];
      }

      ids.add(set.id);
      return [set];
    });
  } catch {
    return [];
  }
}

export function keepSets(
  sets: readonly FavoriteSet[],
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, JSON.stringify({ v: 1, sets }), storage);
}

/** The sets with a new one at the end, and the new one. */
export function addSet(
  sets: readonly FavoriteSet[],
  name: string,
  songs: readonly string[],
): { readonly sets: readonly FavoriteSet[]; readonly added: FavoriteSet } {
  const added = { id: crypto.randomUUID(), name: cleanName(name), songs: cleanSongs(songs) };
  return { sets: [...sets, added], added };
}

const changed = (
  sets: readonly FavoriteSet[],
  id: string,
  change: (set: FavoriteSet) => FavoriteSet,
): readonly FavoriteSet[] =>
  sets.some((set) => set.id === id) ? sets.map((set) => (set.id === id ? change(set) : set)) : sets;

/** A blank name leaves the set as it is. */
export function renameSet(
  sets: readonly FavoriteSet[],
  id: string,
  name: string,
): readonly FavoriteSet[] {
  const renamed = cleanName(name);
  return renamed === "" ? sets : changed(sets, id, (set) => ({ ...set, name: renamed }));
}

export function setSongs(
  sets: readonly FavoriteSet[],
  id: string,
  songs: readonly string[],
): readonly FavoriteSet[] {
  return changed(sets, id, (set) => ({ ...set, songs: cleanSongs(songs) }));
}

export function removeSet(sets: readonly FavoriteSet[], id: string): readonly FavoriteSet[] {
  return sets.filter((set) => set.id !== id);
}

/** The song taken out if it is in, else put last; the same songs if a full set cannot take it. */
export function toggledSongs(songs: readonly string[], songNo: string): readonly string[] {
  if (songs.includes(songNo)) {
    return songs.filter((song) => song !== songNo);
  }

  return songs.length < SET_SONG_LIMIT ? [...songs, songNo] : songs;
}

export function sameSongs(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((song, index) => song === b[index]);
}

/** The folder's songs in the order of its slots, the empty slots left out. */
export function filledSlots({ slots }: FolderState): string[] {
  return slots.filter((songNo): songNo is string => songNo !== null);
}

/** The first "Set N" no set is named, N counting from one more than the sets there are. */
export function newSetName(
  sets: readonly FavoriteSet[],
  nameOf: (number: number) => string,
): string {
  const taken = new Set(sets.map((set) => set.name));
  let number = sets.length + 1;
  while (taken.has(nameOf(number))) {
    number += 1;
  }
  return nameOf(number);
}
