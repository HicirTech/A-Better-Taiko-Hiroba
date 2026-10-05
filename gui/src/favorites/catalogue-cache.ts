import { keepSetting, keptSetting, pageStorage } from "../kept-settings";
import { type CatalogueSong, DIFFICULTIES, type SongCatalogueRead } from "../song-catalogue/types";

const KEY = "abth.songCatalogue";
const DAY_MS = 24 * 60 * 60 * 1000;
const SONG_NO = /^\d{1,5}$/;

// A list kept before its songs carried a tempo and charts is no list, so it is read again in full.
const VERSION = 2;

/** The song list as kept on the device, and when the read that brought it was sent. */
export interface KeptCatalogue {
  readonly v: typeof VERSION;
  readonly sentAt: number;
  readonly songs: readonly CatalogueSong[];
}

const isName = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isGenre = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;

const isLevel = (value: unknown): boolean =>
  value === null || (typeof value === "number" && Number.isInteger(value) && value >= 1);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBpm = (value: unknown): boolean =>
  value === null ||
  (isRecord(value) &&
    typeof value.min === "number" &&
    typeof value.max === "number" &&
    typeof value.wobbles === "boolean");

const isChart = (value: unknown): boolean =>
  value === null ||
  (isRecord(value) &&
    (value.maxCombo === null || typeof value.maxCombo === "number") &&
    typeof value.branched === "boolean" &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === "string"));

function isCatalogueSong(song: unknown): song is CatalogueSong {
  if (!isRecord(song)) {
    return false;
  }

  const { levels, charts } = song;
  return (
    typeof song.songNo === "string" &&
    SONG_NO.test(song.songNo) &&
    typeof song.title === "string" &&
    isName(song.titleEn) &&
    isName(song.titleZh) &&
    isName(song.romaji) &&
    Array.isArray(song.artists) &&
    song.artists.every((artist) => typeof artist === "string") &&
    Array.isArray(song.genres) &&
    song.genres.every(isGenre) &&
    isRecord(levels) &&
    DIFFICULTIES.every((difficulty) => isLevel(levels[difficulty])) &&
    isBpm(song.bpm) &&
    isRecord(charts) &&
    DIFFICULTIES.every((difficulty) => isChart(charts[difficulty]))
  );
}

function isKept(value: unknown): value is KeptCatalogue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { v, sentAt, songs } = value as Record<string, unknown>;
  return (
    v === VERSION &&
    typeof sentAt === "number" &&
    Number.isFinite(sentAt) &&
    Array.isArray(songs) &&
    songs.every(isCatalogueSong)
  );
}

export function loadCatalogue(storage: Storage | undefined = pageStorage()): KeptCatalogue | null {
  const text = keptSetting(KEY, (value): value is string => typeof value === "string", storage);
  if (text === null) {
    return null;
  }

  try {
    const kept: unknown = JSON.parse(text);
    return isKept(kept) ? kept : null;
  } catch {
    return null;
  }
}

export function keepCatalogue(
  kept: KeptCatalogue,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, JSON.stringify(kept), storage);
}

/** The read's songs replace or add to those kept by song number, and the ones it removed go. */
export function mergeCatalogue(kept: KeptCatalogue | null, read: SongCatalogueRead): KeptCatalogue {
  const bySongNo = new Map((kept?.songs ?? []).map((song) => [song.songNo, song]));
  for (const song of read.songs) {
    bySongNo.set(song.songNo, song);
  }

  for (const songNo of read.removed) {
    bySongNo.delete(songNo);
  }
  return { v: VERSION, sentAt: read.sentAt, songs: [...bySongNo.values()] };
}

/** What to ask taiko.wiki for, or none while the song list kept is a day old at most. */
export function nextCatalogueRead(
  kept: KeptCatalogue | null,
  now: number,
): { readonly since: number | null } | null {
  if (kept === null) {
    return { since: null };
  }

  // A day back from the last read, so a song changed while it was on its way is read again.
  return now - kept.sentAt > DAY_MS ? { since: kept.sentAt - DAY_MS } : null;
}
