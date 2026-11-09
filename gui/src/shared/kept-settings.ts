import { isObject } from "@abth/core";

export function pageStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function keptSetting<T>(
  key: string,
  isValue: (value: unknown) => value is T,
  storage: Storage | undefined = pageStorage(),
): T | null {
  try {
    const value = storage?.getItem(key);
    return isValue(value) ? value : null;
  } catch {
    return null;
  }
}

export function keepSetting(
  key: string,
  value: string,
  storage: Storage | undefined = pageStorage(),
): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // A private or full store: the setting still holds until the app closes.
  }
}

export function forgetSetting(key: string, storage: Storage | undefined = pageStorage()): void {
  try {
    storage?.removeItem(key);
  } catch {
    // A store that refuses: the setting comes back at the next launch.
  }
}

const isText = (value: unknown): value is string => typeof value === "string";

/** `valueIn` of the JSON kept under `key` at `version`; null for none or another shape. */
export function keptJson<T>(
  key: string,
  version: number,
  valueIn: (kept: Record<string, unknown>) => T | null,
  storage: Storage | undefined = pageStorage(),
): T | null {
  const text = keptSetting(key, isText, storage);
  if (text === null) {
    return null;
  }

  try {
    const kept: unknown = JSON.parse(text);
    return isObject(kept) && kept.v === version ? valueIn(kept) : null;
  } catch {
    return null;
  }
}

/** Keeps `value` as JSON under `key`, marked with the `version` of its shape. */
export function keepJson(
  key: string,
  version: number,
  value: object,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(key, JSON.stringify({ v: version, ...value }), storage);
}
