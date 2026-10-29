import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** The tips this device has shown, kept as Settings' choices are: a sign-out keeps them. */
export const SEEN_TIPS_KEY = "abth.tipsSeen";

const isText = (value: unknown): value is string => typeof value === "string";

/** The ids of the tips gone past on this device; none where nothing readable is kept. */
export function keptSeenTips(storage: Storage | undefined = pageStorage()): ReadonlySet<string> {
  try {
    const ids: unknown = JSON.parse(keptSetting(SEEN_TIPS_KEY, isText, storage) ?? "[]");
    return new Set(Array.isArray(ids) ? ids.filter(isText) : []);
  } catch {
    return new Set();
  }
}

export function keepSeenTips(
  ids: Iterable<string>,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(SEEN_TIPS_KEY, JSON.stringify([...new Set(ids)]), storage);
}
