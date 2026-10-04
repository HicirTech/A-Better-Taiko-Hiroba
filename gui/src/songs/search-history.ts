import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

const KEY = "abth.songSearches";
export const RECENT_SEARCHES = 10;
const MAX_QUERY_LENGTH = 100;

const isText = (value: unknown): value is string => typeof value === "string";

/** The searches kept on this device, the latest first. */
export function keptSearches(storage: Storage | undefined = pageStorage()): readonly string[] {
  const text = keptSetting(KEY, isText, storage);
  if (text === null) {
    return [];
  }

  try {
    const kept: unknown = JSON.parse(text);
    return Array.isArray(kept)
      ? kept.filter((query) => isText(query) && query.trim() !== "").slice(0, RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

/** Keeps `query` as the latest search, once, and drops the oldest beyond RECENT_SEARCHES. */
export function rememberSearch(
  query: string,
  storage: Storage | undefined = pageStorage(),
): readonly string[] {
  const latest = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (latest === "") {
    return keptSearches(storage);
  }

  const searches = [latest, ...keptSearches(storage).filter((one) => one !== latest)].slice(
    0,
    RECENT_SEARCHES,
  );
  keepSetting(KEY, JSON.stringify(searches), storage);
  return searches;
}

export function forgetSearch(
  query: string,
  storage: Storage | undefined = pageStorage(),
): readonly string[] {
  const searches = keptSearches(storage).filter((one) => one !== query);
  keepSetting(KEY, JSON.stringify(searches), storage);
  return searches;
}
