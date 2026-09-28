/**
 * The settings the window keeps on this device, in the app page's localStorage: the language picked
 * and the page last shown. Each is a convenience, so a store that cannot be used costs only the
 * memory of it: the setting still holds for the run.
 */

/** The page's storage, or nothing where the page may not use it. */
export function pageStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The setting kept under `key`, or null when none is, when it is not one `isValue` takes, or when
 * it cannot be read.
 */
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

/** Keeps a setting for the next launch. One that cannot be kept holds for this run alone. */
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
