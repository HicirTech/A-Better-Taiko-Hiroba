import type { Result } from "@abth/core";

import { pageStorage } from "../kept-settings";
import { isNewer, type UpdateFeed, type UpdateFeedFailure } from "./update-feed";
import {
  keepShownVersion,
  keepUpdateCheck,
  lastShownVersion,
  lastUpdateCheck,
} from "./update-memory";

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type ReadFeed = () => Promise<Result<UpdateFeed, UpdateFeedFailure>>;

/** Whether a launch-time check is due: none went out yet, or the last did a day ago or more. */
export function checkIsDue(lastCheckedAt: number | null, now: number): boolean {
  if (lastCheckedAt === null) {
    return true;
  }
  const age = now - lastCheckedAt;
  // A clock set back since then must not hold the check off.
  return age < 0 || age >= CHECK_INTERVAL_MS;
}

/** Whether a launch-time check may tell of a feed: it is later than the build and the last told. */
export function isWorthShowing(
  feedVersion: string,
  current: string,
  lastShown: string | null,
): boolean {
  return isNewer(feedVersion, current) && (lastShown === null || isNewer(feedVersion, lastShown));
}

/** The feed to tell of at launch, or null; failures are silent, and a day lies between requests. */
export async function automaticUpdateOffer(
  read: ReadFeed,
  current: string,
  now: number,
  storage: Storage | undefined = pageStorage(),
): Promise<UpdateFeed | null> {
  if (!checkIsDue(lastUpdateCheck(storage), now)) {
    return null;
  }
  const feed = await read();
  if (feed.ok || feed.error.code !== "notConfigured") {
    keepUpdateCheck(now, storage);
  }
  if (!feed.ok || !isWorthShowing(feed.value.version, current, lastShownVersion(storage))) {
    return null;
  }
  keepShownVersion(feed.value.version, storage);
  return feed.value;
}

/** What a check the player asked for found. */
export type ManualCheckResult =
  | { readonly kind: "newer"; readonly feed: UpdateFeed }
  | { readonly kind: "upToDate" }
  | { readonly kind: "failed" };

/** The check the player asked for: it tells of a newer version however often it was told of. */
export async function manualUpdateCheck(
  read: ReadFeed,
  current: string,
): Promise<ManualCheckResult> {
  const feed = await read();
  if (!feed.ok) {
    return { kind: "failed" };
  }
  return isNewer(feed.value.version, current)
    ? { kind: "newer", feed: feed.value }
    : { kind: "upToDate" };
}
