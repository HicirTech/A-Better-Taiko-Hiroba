import { err, type Genre, ok, type Result } from "@abth/core";

import {
  type CatalogueSong,
  type Difficulty,
  MAX_LEVEL,
  MIN_LEVEL,
  type SongCatalogueRead,
} from "./types";

export const MAX_CATALOGUE_LENGTH = 16 * 1024 * 1024;

/** Hiroba's song numbers; a console-only song has one such as `ns2_…`, which Hiroba does not know. */
const HIROBA_SONG_NO = /^\d{1,5}$/;

const GENRE_OF_WIKI_NAME: ReadonlyMap<string, Genre> = new Map<string, Genre>([
  ["pops", 1],
  ["anime", 2],
  ["kids", 3],
  ["vocaloid", 4],
  ["game", 5],
  ["namco", 6],
  ["variety", 7],
  ["classic", 8],
]);

const BAD_ANSWER = { code: "badAnswer" } as const;

type WikiEntry = Readonly<Record<string, unknown>>;

const isEntry = (value: unknown): value is WikiEntry =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLevel = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= MIN_LEVEL && value <= MAX_LEVEL;

/** `value` without the spaces around it, or null when it is not text or is blank. */
function textOf(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

/** Another title for the song, or null when there is none or it only repeats `title`. */
function otherTitle(value: unknown, title: string): string | null {
  const text = textOf(value);
  return text === title ? null : text;
}

function artistsOf(names: unknown): string[] {
  return Array.isArray(names) ? names.map(textOf).filter((artist) => artist !== null) : [];
}

function genresOf(names: unknown): Genre[] {
  const genres: Genre[] = [];
  for (const name of Array.isArray(names) ? names : []) {
    const genre = typeof name === "string" ? GENRE_OF_WIKI_NAME.get(name) : undefined;
    if (genre !== undefined && !genres.includes(genre)) {
      genres.push(genre);
    }
  }
  return genres;
}

function levelsOf(courses: unknown): Record<Difficulty, number | null> {
  const levelOf = (difficulty: Difficulty): number | null => {
    const course = isEntry(courses) ? courses[difficulty] : null;
    return isEntry(course) && isLevel(course.level) ? course.level : null;
  };
  return {
    easy: levelOf("easy"),
    normal: levelOf("normal"),
    hard: levelOf("hard"),
    oni: levelOf("oni"),
    ura: levelOf("ura"),
  };
}

function songOf(entry: WikiEntry, songNo: string): CatalogueSong | null {
  const title = textOf(entry.title);
  if (title === null) {
    return null;
  }
  return {
    songNo,
    title,
    titleEn: otherTitle(entry.titleEn, title),
    titleZh: otherTitle(entry.titleZhCN, title),
    romaji: otherTitle(entry.romaji, title),
    artists: artistsOf(entry.artists),
    genres: genresOf(entry.genre),
    levels: levelsOf(entry.courses),
  };
}

/** taiko.wiki's song list, as `/api/v1/song/all` answers it, cut to the app's own shape. */
export function parseWikiSongs(
  text: string,
): Result<Omit<SongCatalogueRead, "sentAt">, { readonly code: "badAnswer" }> {
  if (text.length > MAX_CATALOGUE_LENGTH) {
    return err(BAD_ANSWER);
  }
  let entries: unknown;
  try {
    entries = JSON.parse(text);
  } catch {
    return err(BAD_ANSWER);
  }
  if (!Array.isArray(entries)) {
    return err(BAD_ANSWER);
  }
  const songs: CatalogueSong[] = [];
  const removed: string[] = [];
  for (const entry of entries) {
    if (!isEntry(entry)) {
      continue;
    }
    const { songNo } = entry;
    if (typeof songNo !== "string" || !HIROBA_SONG_NO.test(songNo)) {
      continue;
    }
    if (entry.isDeleted === 1) {
      removed.push(songNo);
      continue;
    }
    const song = songOf(entry, songNo);
    if (song !== null) {
      songs.push(song);
    }
  }
  return ok({ songs, removed });
}
