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
