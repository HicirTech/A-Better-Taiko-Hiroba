import { keepSetting, keptSetting, pageStorage } from "../kept-settings";
import { isVersion } from "./update-feed";

const CHECKED_KEY = "abth.update.checkedAt";
const SHOWN_KEY = "abth.update.shown";

const isMilliseconds = (value: unknown): value is string =>
  typeof value === "string" && /^\d{1,15}$/.test(value);

/** When a check last went out, in milliseconds since 1970; null when none did. */
export function lastUpdateCheck(storage: Storage | undefined = pageStorage()): number | null {
  const kept = keptSetting(CHECKED_KEY, isMilliseconds, storage);
  return kept === null ? null : Number(kept);
}

export function keepUpdateCheck(at: number, storage: Storage | undefined = pageStorage()): void {
  keepSetting(CHECKED_KEY, String(at), storage);
}

/** The version a launch-time check last told of; null when it has told of none. */
export function lastShownVersion(storage: Storage | undefined = pageStorage()): string | null {
  return keptSetting(SHOWN_KEY, isVersion, storage);
}

export function keepShownVersion(
  version: string,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(SHOWN_KEY, version, storage);
}
